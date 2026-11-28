/**
 * Backend HTTP test — r370: `/status` carries the NATIVE version pair.
 *
 * Found: the update gate compared `version: "1.0.0"`, a constant every APK
 * shipped, so a published build could never be recognised as newer and an
 * outdated binary could never be blocked. The app now orders builds by
 * Android `versionCode` (CI run number + channel base) and falls back to
 * semver only when the server publishes no code.
 *
 * This pins the server half of that contract:
 *   (a) the two keys always exist (number | null — never undefined), so an
 *       old app and the new one read the same shape;
 *   (b) an unset deployment reports null (no gate), never a fabricated 0;
 *   (c) the semver pair is still reported (old clients keep working);
 *   (d) /status still pings the DB (the health half is unchanged).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

vi.mock('../../src/db.js', () => ({
  prisma: { $queryRaw: vi.fn() },
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';

type Server = ReturnType<ReturnType<typeof createApp>['listen']>;

const boot = () => {
  const server = createApp().listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { server, baseUrl };
};

const close = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });

const queryRaw = vi.mocked(prisma.$queryRaw);

let server: Server;
let baseUrl: string;

beforeAll(() => {
  // The DB ping resolves — this file is about the payload, not the probe.
  queryRaw.mockResolvedValue([{ '?column?': 1 }] as never);
  ({ server, baseUrl } = boot());
});

afterAll(async () => {
  await close(server);
});

async function status() {
  const res = await fetch(`${baseUrl}/api/v1/status`);
  return { status: res.status, json: (await res.json()) as any };
}

describe('GET /status — the native version pair (r370)', () => {
  it('answers 200 in the standard envelope', async () => {
    const { status: code, json } = await status();
    expect(code).toBe(200);
    expect(json.data).toBeTypeOf('object');
  });

  it('always carries minVersionCode / latestVersionCode as number | null', async () => {
    const { json } = await status();
    for (const key of ['minVersionCode', 'latestVersionCode'] as const) {
      expect(json.data).toHaveProperty(key);
      const value = json.data[key];
      expect(value === null || typeof value === 'number').toBe(true);
    }
  });

  it('reports null (no gate) when the deployment sets no code', async () => {
    // The bare-clone contract: an unset variable is "no policy", never 0 —
    // 0 would block every build.
    expect(process.env.MIN_VERSION_CODE).toBeUndefined();
    expect(process.env.LATEST_VERSION_CODE).toBeUndefined();
    const { json } = await status();
    expect(json.data.minVersionCode).toBeNull();
    expect(json.data.latestVersionCode).toBeNull();
  });

  it('keeps the semver pair for clients that predate the code', async () => {
    const { json } = await status();
    expect(json.data).toHaveProperty('minAppVersion');
    expect(json.data).toHaveProperty('latestAppVersion');
    expect(json.data).toHaveProperty('updateUrl');
  });

  it('still pings the database (the health half is unchanged)', async () => {
    await status();
    expect(queryRaw).toHaveBeenCalled();
  });
});
