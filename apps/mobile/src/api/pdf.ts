/**
 * PDF + file transport — preserves the backend's raw-bytes contract exactly:
 * POST /files/papers (and materials/file) expect `Content-Type: application/pdf`
 * with raw PDF bytes — NOT multipart. PDF-only, `%PDF-` magic bytes, per-user
 * quota, and the HOST-HONEST size ceiling (Ω+2.0): the product cap is 20 MiB,
 * but *.vercel.app APIs ride Vercel Functions whose bodies cap at 4.5 MB
 * (verified live 2026-11-11) — the backend enforces/advertises 4 MiB there
 * (/api/v1/status → data.maxPdfUploadBytes) and this mirror derives the same
 * number from the API base so the app never names a limit the host refuses.
 */
import { File, Paths, UploadType } from "expo-file-system";
import { API_BASE, ApiError, absoluteUrl } from "./client";
import { useSession } from "@/auth/session";

/** 20 MiB — the PRODUCT cap (self-hosted / non-Vercel backends). */
export const PDF_MAX_BYTES = 20 * 1024 * 1024;

/** 4 MiB — the Vercel Functions transfer ceiling (under the 4.5 MB wall). */
export const VERCEL_PDF_MAX_BYTES = 4 * 1024 * 1024;

/** The effective ceiling for the CONFIGURED API host — derived, never hand-typed. */
export function effectivePdfMaxBytes(apiBase: string = API_BASE): number {
  return apiBase.includes(".vercel.app") ? VERCEL_PDF_MAX_BYTES : PDF_MAX_BYTES;
}

function pdfMaxMb(apiBase: string = API_BASE): number {
  return Math.round(effectivePdfMaxBytes(apiBase) / (1024 * 1024));
}

/** Pick a single PDF via the system document picker (null when canceled). */
export async function pickPdf(): Promise<File | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ["application/pdf"] });
  if (!picked || picked.canceled || !picked.result) return null;
  const file = picked.result as unknown as File;
  return file;
}

/**
 * Deep validation mirroring frontend/src/lib/pdfUpload.ts:
 * PDF-only by MIME/name, ≤20MB, and real `%PDF-` magic bytes (not just extension).
 */
export async function validatePdf(file: File): Promise<void> {
  const name = (file as unknown as { name?: string }).name ?? file.uri ?? "";
  const mimeOk = (file as unknown as { type?: string }).type === "application/pdf" || /\.pdf$/i.test(name);
  if (!mimeOk) {
    throw new ApiError("PDF_ONLY", "الملف يجب أن يكون بصيغة PDF فقط.", 400);
  }
  if (file.size > effectivePdfMaxBytes()) {
    throw new ApiError(
      "PAYLOAD_TOO_LARGE",
      `حجم الملف يتجاوز الحد الأقصى المسموح (${pdfMaxMb()} ميغابايت).`,
      413,
    );
  }
  if (file.size <= 0) {
    throw new ApiError("EMPTY", "محتوى الملف فارغ.", 400);
  }
  let head = new Uint8Array();
  try {
    const bytes = await file.bytes();
    head = bytes.slice(0, 5);
  } catch {
    // If bytes are unreadable the server-side magic check still guards us.
  }
  const magic = "%PDF-";
  if (head.length >= 5 && !magic.includes(String.fromCharCode(...head))) {
    throw new ApiError("BAD_PDF", "محتوى الملف ليس PDF صالحًا (بصمة الملف لا تطابق).", 400);
  }
}

/**
 * Raw PDF upload with progress against a backend endpoint.
 * The endpoint path/query comes from the caller (papers vs materials differ).
 */
export async function uploadRawPdf(
  file: File,
  path: string,
  onProgress?: (fraction: number) => void,
): Promise<unknown> {
  const token = useSession.getState().accessToken;
  const res = await file.upload(`${API_BASE}${path}`, {
    uploadType: UploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": "application/pdf",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    onProgress: ({ bytesSent, totalBytes }: { bytesSent: number; totalBytes: number }) => {
      if (totalBytes > 0 && onProgress) onProgress(Math.min(1, bytesSent / totalBytes));
    },
  });
  let parsed: { data?: unknown; error?: { code?: string; message?: string } } | null = null;
  try {
    parsed = JSON.parse(res.body ?? "{}");
  } catch {
    parsed = null;
  }
  if (res.status >= 400) {
    throw new ApiError(
      parsed?.error?.code ?? "UPLOAD_FAILED",
      parsed?.error?.message ?? `فشل رفع الملف (رمز ${res.status}).`,
      res.status,
    );
  }
  return parsed?.data ?? parsed;
}

/** Download an authenticated file to the app cache (returns a local File). */
export async function downloadAuthenticated(
  url: string | null | undefined,
  suggestedName: string,
): Promise<File> {
  const abs = absoluteUrl(url);
  if (!abs) throw new ApiError("BAD_URL", "رابط الملف غير صالح.", 400);
  const token = useSession.getState().accessToken;
  const res = await fetch(abs, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    throw new ApiError("DOWNLOAD_FAILED", `تعذّر تنزيل الملف (رمز ${res.status}).`, res.status);
  }
  const buf = await res.arrayBuffer();
  const safe = suggestedName.replace(/[^\w.\-]+/g, "_");
  const local = new File(Paths.cache, `ula-${safe}-${Date.now()}`);
  await local.write(new Uint8Array(buf));
  return local;
}
