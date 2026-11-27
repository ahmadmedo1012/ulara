/**
 * authErrors — العرض الأمين لأخطاء المصادقة (r157 / F5).
 *
 * عقد D17-3 (مستند القرارات المرقّم docs/16 — ضاع في squash الـ 1.0؛
 * العقد الحي هو هذا الملف واختباراته): أكواد الأخطاء إنجليزية
 * UPPER_SNAKE، والرسائل الموجّهة للمستخدم عربية من الخلفية نفسها
 * (`backend/src/lib/errors.ts` → `{ error: { code, message } }`). رسالة الخلفية
 * العربية يجب أن تظهر للزائر حرفيًا — لا نصنع لها بديلًا عامًا يخفي السبب
 * الحقيقي (401 «البريد الإلكتروني أو كلمة المرور غير صحيحة»، 403 «هذا
 * الحساب معطّل — تواصل مع إدارة الجامعة»، 409 «البريد الإلكتروني مسجّل
 * مسبقاً»). الحارس العربي (apiErrorDetail / 15-j P0-1) يبقى خطّ الدفاع:
 * نصٌّ لاتينيّ خالص من طبقة النقل لا يظهر في الواجهة RTL أبدًا.
 *
 * الاستثناء الوحيد للرسالة العامة: لا يوجد `error.response` أصلًا (عطل شبكة)
 * — عندها لا توجد رسالة خلفية لنعرضها.
 */
import { apiErrorDetail } from './format';

export interface AuthErrorView {
  /**
   * رسالة الخلفية العربية كما كتبها الخادم (verbatim)، أو undefined حين
   * لا استجابة (شبكة) أو حين يرفضها الحارس العربي (نص لاتيني خالص).
   */
  serverMessage?: string;
  /** تعارض 409 (CONFLICT) — يحرّك رابط «سجِّل الدخول» في صفحة التسجيل. */
  isConflict: boolean;
}

/** هل للأخط استجابة HTTP (أي ليس فشل شبكة قبل بلوغ الخادم)؟ */
function hasResponse(error: unknown): boolean {
  return Boolean((error as { response?: unknown } | null)?.response);
}

function statusOf(error: unknown): number | undefined {
  const status = (error as { response?: { status?: unknown } } | null)?.response?.status;
  return typeof status === 'number' ? status : undefined;
}

/**
 * طاقة عرض واحدة لكل استمارات المصادقة (تسجيل الدخول + إنشاء الحساب):
 * النص الحرفي للخلفية حين يكون عربيًا، وتبديل الحكم على تعارض 409.
 */
/**
 * جواب وصل من منصّة الاستضافة لا من واجهة ألارا: لا غلاف `{ error: { code } }`
 * وحالة 401/403/404/502/503 (مثل حماية النشر في Vercel على نسخ المعاينة،
 * أو واجهة خلفية غير موجودة). رسالة «بيانات غير صحيحة» هنا مضلّلة، فنقول
 * السبب الحقيقي بدل الرسالة العامة.
 */
export const PLATFORM_BLOCK_MESSAGE =
  'لم يصل طلب الدخول إلى خادم ألارا: العنوان الحالي محمي أو غير موصول بالخلفية (غالبًا نسخة معاينة). سجّل الدخول إلى حساب الاستضافة أو افتح النطاق الرسمي، أو تواصل مع مسؤول النشر.';

function isPlatformBlock(error: unknown): boolean {
  const res = (error as { response?: { status?: unknown; data?: unknown } } | null)?.response;
  if (!res) return false;
  const status = typeof res.status === 'number' ? res.status : 0;
  if (![401, 403, 404, 502, 503].includes(status)) return false;
  const data = res.data as { error?: { code?: unknown } } | string | null | undefined;
  return !(data && typeof data === 'object' && typeof data.error?.code === 'string');
}

export function authErrorView(error: unknown): AuthErrorView {
  const responded = hasResponse(error);
  if (responded && isPlatformBlock(error)) {
    return { serverMessage: PLATFORM_BLOCK_MESSAGE, isConflict: false };
  }
  return {
    serverMessage: responded ? (apiErrorDetail(error) ?? undefined) : undefined,
    isConflict: statusOf(error) === 409,
  };
}
