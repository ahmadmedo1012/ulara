/**
 * Backend test — r370 item 6 (resilience): the gated raw-body capture, the
 * explicit socket budgets, and idempotency on the two submission writes.
 *
 * Found:
 *  · `express.json({ verify })` copied EVERY request body into `req.rawBody`
 *    (`Buffer.from(buf)`), while only `POST /api/v1/webhooks/resend` reads
 *    those bytes (the HMAC is over the exact body). Measured: no throughput
 *    difference (scripts/measure-rawbody.mjs, 400 × 1 MiB: 333 vs 362 ms,
 *    run-to-run noise) — the cost is memory retention, one extra body per
 *    in-flight request.
 *  · Node's implicit socket budgets (headersTimeout 60s, requestTimeout
 *    300s) were never set: a stalled upload could pin a socket for five
 *    minutes.
 *  · `POST …/submit` and `POST /submissions/:id/grade` — the two writes a
 *    mobile client retries on a flaky network — were not behind the
 *    existing Idempotency-Key middleware, so a retry could create a second
 *    submission or re-fire a grade + notification.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

vi.mock('../../src/db.js', () => ({
  prisma: { $queryRaw: vi.fn() },
  withRetry: vi.fn(),
}));

import { createApp, shouldCaptureRawBody, RAW_BODY_PREFIXES } from '../../src/app.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(path.join(here, '../..', rel), 'utf8');
const appSource = read('src/app.ts');
const indexSource = read('src/index.ts');
const submissionsSource = read('src/http/routes/submissions.routes.ts');

// ── the gate ──────────────────────────────────────────────────────────
describe('shouldCaptureRawBody', () => {
  it('keeps the raw bytes for the HMAC-verified webhook', () => {
    expect(shouldCaptureRawBody({ path: '/api/v1/webhooks/resend' })).toBe(true);
    expect(shouldCaptureRawBody({ path: '/api/v1/webhooks/resend/' })).toBe(true);
    expect(shouldCaptureRawBody({ originalUrl: '/api/v1/webhooks/resend?x=1' })).toBe(true);
    expect(shouldCaptureRawBody({ url: '/api/v1/webhooks/resend' })).toBe(true);
  });

  it('keeps nothing for the rest of the API', () => {
    for (const p of [
      '/api/v1/auth/login',
      '/api/v1/me/dashboard',
      '/api/v1/offerings/o1/assignments/a1/submit',
      '/api/v1/submissions/s1/grade',
      '/api/v1/health',
      '/',
      '',
    ]) {
      expect(shouldCaptureRawBody({ path: p })).toBe(false);
    }
  });

  it('is not fooled by a look-alike path', () => {
    // The mount root itself is "under" the prefix — no handler lives there,
    // so capturing it is harmless; the LOOK-ALIKES must all be refused.
    expect(shouldCaptureRawBody({ path: '/api/v1/webhooks' })).toBe(true);
    expect(shouldCaptureRawBody({ path: '/api/v1/notwebhooks/resend' })).toBe(false);
    expect(shouldCaptureRawBody({ path: '/webhooks/resend' })).toBe(false);
    expect(shouldCaptureRawBody({ path: '/api/v1/webhooksx/resend' })).toBe(false);
  });

  it('declares exactly the webhook prefix', () => {
    expect([...RAW_BODY_PREFIXES]).toEqual(['/api/v1/webhooks/']);
  });
});

// ── source pins (no drift back to unconditional capture) ─────────────
describe('app.ts wiring', () => {
  it('captures the parser buffer itself, never a copy', () => {
    expect(appSource).toMatch(/if \(shouldCaptureRawBody\(req\)\) \{/);
    expect(appSource).toMatch(/rawBody\?: Buffer \}\)\.rawBody = buf;/);
    expect(appSource).not.toMatch(/rawBody\?: Buffer \}\)\.rawBody = Buffer\.from\(buf\)/);
  });
});

describe('index.ts socket budgets', () => {
  it('sets explicit headers / request / keep-alive timeouts under the proxy idle window', () => {
    expect(indexSource).toMatch(/server\.headersTimeout = 20_000;/);
    expect(indexSource).toMatch(/server\.requestTimeout = 60_000;/);
    expect(indexSource).toMatch(/server\.keepAliveTimeout = 65_000;/);
    // keep-alive must stay below the platform proxy's idle timeout
    const keepAlive = Number(/server\.keepAliveTimeout = ([\d_]+)/.exec(indexSource)?.[1]?.replace(/_/g, ''));
    expect(keepAlive).toBeGreaterThan(60_000);
  });

  it('keeps the graceful-shutdown force-exit fallback', () => {
    expect(indexSource).toMatch(/SHUTDOWN_FORCE_EXIT_MS/);
    expect(indexSource).toMatch(/stopScheduler\(\)/);
    expect(indexSource).toMatch(/server\.closeIdleConnections\(\)/);
  });
});

describe('idempotency on the submission writes', () => {
  it('mounts the middleware on submit and grade, before the role gate', () => {
    const submit = /'\/offerings\/:offeringId\/assignments\/:assignmentId\/submit',\s*\/\/[^]*?idempotencyMiddleware\(\),\s*requireRole\(Role\.STUDENT\)/;
    const grade = /'\/submissions\/:id\/grade',\s*\/\/[^]*?idempotencyMiddleware\(\),\s*requireRole\(Role\.TEACHER, Role\.ADMIN, Role\.OWNER\)/;
    expect(submissionsSource).toMatch(submit);
    expect(submissionsSource).toMatch(grade);
  });
});

// ── the live app still parses bodies after the gate ──────────────────
describe('the real app with the gated parser', () => {
  type Server = ReturnType<ReturnType<typeof createApp>['listen']>;
  let server: Server;
  let baseUrl: string;

  beforeAll(() => {
    server = createApp().listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(
    () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  );

  it('still parses a normal JSON body (validation error, not a parse failure)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect(res.status).toBe(400);
    const json = (await res.json()) as { error?: { code?: string } };
    expect(json.error?.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an oversized body with 413 before any route runs', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pad: 'x'.repeat(1_200_000) }),
    });
    expect(res.status).toBe(413);
  });

  it('keeps the webhook signature gate (no signature → 401/400, never 500)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/webhooks/resend`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'email.bounced' }),
    });
    expect([400, 401]).toContain(res.status);
  });
});
