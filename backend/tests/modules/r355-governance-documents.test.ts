import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import express from 'express';
import type { Server } from 'node:http';
import { Role } from '@prisma/client';

// Mock auth & institution middleware to directly authenticate test user
vi.mock('../../src/http/middleware/auth.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 'usr_admin', role: Role.ADMIN, institutionId: 'inst_demo' } as never;
    next();
  },
}));

vi.mock('../../src/http/middleware/institution.js', () => ({
  requireInstitution: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.institution = { id: 'inst_demo', name: 'جامعة أُلارا' } as never;
    next();
  },
}));

// Mock storage
const mockStorageData = new Map<string, Buffer>();
vi.mock('../../src/lib/storage.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/storage.js')>();
  return {
    ...actual,
    getStorage: () => ({
      put: vi.fn(async (key: string, bytes: Buffer) => {
        mockStorageData.set(key, bytes);
      }),
      get: vi.fn(async (key: string) => mockStorageData.get(key) ?? null),
      getRange: vi.fn(async (key: string, start: number, end: number) => {
        const b = mockStorageData.get(key);
        if (!b) return null;
        return b.subarray(start, end + 1);
      }),
      stat: vi.fn(async (key: string) => {
        const b = mockStorageData.get(key);
        if (!b) return null;
        return { size: b.length };
      }),
    }),
  };
});

// Mock db
const councilDocumentFindUnique = vi.fn();
const auditCreate = vi.fn();
vi.mock('../../src/db.js', () => ({
  prisma: {
    councilDocument: {
      findUnique: (...args: unknown[]) => councilDocumentFindUnique(...args),
      create: vi.fn(),
    },
    auditLog: {
      create: (...args: unknown[]) => auditCreate(...args),
    },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
}));

// Mock permissions
vi.mock('../../src/lib/permissions.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/permissions.js')>();
  return {
    ...actual,
    assertCapabilityIn: vi.fn(async () => {}),
    assertCapabilityForUnit: vi.fn(async () => {}),
  };
});

describe('D-6 Governance Documents Upload & Download', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    const router = (await import('../../src/http/routes/r352-councils.routes.js')).default;
    app.use('/governance', router);

    // Error handling middleware
    app.use((err: { status?: number; statusCode?: number; message?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const status = err.status || err.statusCode || 500;
      res.status(status).json({ error: { message: err.message } });
    });

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageData.clear();
  });

  it('rejects non-PDF payloads with 400', async () => {
    const res = await fetch(`${baseUrl}/governance/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'hello world plain text',
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: { message?: string } };
    expect(json.error?.message).toContain('PDF');
  });

  it('rejects PDF payloads missing magic bytes %PDF-', async () => {
    const fakeBytes = Buffer.from('NOT_A_VALID_PDF_HEADER_ABCXYZ');
    const res = await fetch(`${baseUrl}/governance/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: fakeBytes,
    });

    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: { message?: string } };
    expect(json.error?.message).toContain('PDF');
  });

  it('accepts valid PDF bytes, stores with tenant-scoped key, and returns 201', async () => {
    const validPdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const res = await fetch(`${baseUrl}/governance/documents/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf' },
      body: validPdfBytes,
    });

    expect(res.status).toBe(201);
    const json = (await res.json()) as { data: { key: string; sizeBytes: number } };
    expect(json.data).toBeDefined();
    expect(json.data.key).toMatch(/^governance\/inst_demo\/[a-zA-Z0-9_-]+\.pdf$/);
    expect(json.data.sizeBytes).toBe(validPdfBytes.length);
    expect(mockStorageData.has(json.data.key)).toBe(true);
  });

  it('GET /governance/documents/:id/file streams PDF for valid document in caller institution', async () => {
    const validPdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const storageKey = 'governance/inst_demo/doc_test.pdf';
    mockStorageData.set(storageKey, validPdfBytes);

    councilDocumentFindUnique.mockResolvedValueOnce({
      id: 'doc_123',
      titleAr: 'لائحة الدراسة والامتحانات',
      binaryObjectId: storageKey,
      council: {
        institutionId: 'inst_demo',
        orgUnitId: null,
      },
    });

    const res = await fetch(`${baseUrl}/governance/documents/doc_123/file`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.equals(validPdfBytes)).toBe(true);
  });

  it('GET /governance/documents/:id/file refuses cross-tenant document with 404', async () => {
    councilDocumentFindUnique.mockResolvedValueOnce({
      id: 'doc_other',
      titleAr: 'وثيقة سرية لمؤسسة أخرى',
      binaryObjectId: 'governance/inst_other/doc_test.pdf',
      council: {
        institutionId: 'inst_other', // foreign tenant!
        orgUnitId: null,
      },
    });

    const res = await fetch(`${baseUrl}/governance/documents/doc_other/file`);
    expect(res.status).toBe(404);
  });
});
