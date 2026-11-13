/**
 * PDF transfer limits — the host-honest ceiling (Ω+2.0).
 *
 * The PRODUCT cap is 20 MiB (papers, materials, offering syllabi). But a
 * deployment's PLATFORM may cap the HTTP transfer itself lower, and the
 * product must never advertise what its host refuses to carry:
 *
 *   Vercel Functions reject any request/response body over 4.5 MB —
 *   verified live against production on 2026-11-11: a 5 MB POST to
 *   /api/v1/* dies at the platform edge with an opaque 413 (the app
 *   never sees the bytes). The same wall applies to response bodies,
 *   so serving a >4.5 MB stored PDF in one shot is equally doomed.
 *
 * On Vercel the effective ceiling is therefore 4 MiB — a deliberate
 * safety margin UNDER the platform wall, so an oversize upload dies
 * inside express.raw / isUploadSizeOk with the APP's Arabic 413
 * envelope instead of on the platform's opaque error page. Non-Vercel
 * hosts (self-hosted Express, Render-style) have no such body wall and
 * keep the full 20 MiB product cap.
 *
 * The ceiling is advertised machine-readably via GET /api/v1/status →
 * data.maxPdfUploadBytes so clients can mirror it without hardcoding.
 * Removing the wall entirely (20 MiB everywhere) is the presigned
 * direct-to-object-storage path (S3_* driver vars; the lectures
 * namespace already rides it — storage-presign.ts); that extension to
 * PDFs is planned work, tracked in RELEASE.md §storage.
 */
export const PDF_PRODUCT_MAX_BYTES = 20 * 1024 * 1024;

/** The Vercel-safe ceiling — 4 MiB, under the 4.5 MB platform wall. */
export const VERCEL_PDF_MAX_BYTES = 4 * 1024 * 1024;

/**
 * Pure decision: the effective ceiling for a host. Injected in tests
 * (`effectivePdfMaxBytes(true)` pins the Vercel branch); the default
 * resolves the CURRENT runtime.
 */
export function effectivePdfMaxBytes(isVercel: boolean): number {
  return isVercel ? VERCEL_PDF_MAX_BYTES : PDF_PRODUCT_MAX_BYTES;
}

/**
 * Vercel runtime detection: VERCEL=1 is set on every Vercel Functions
 * invocation; VERCEL_GIT_COMMIT_SHA is the belt (also consumed by the
 * build-id logic in status.routes.ts).
 */
export function isVercelRuntime(): boolean {
  return process.env.VERCEL === '1' || process.env.VERCEL_GIT_COMMIT_SHA !== undefined;
}

/** The effective ceiling for THIS runtime (module-load constant). */
export const RUNTIME_PDF_MAX_BYTES = effectivePdfMaxBytes(isVercelRuntime());
