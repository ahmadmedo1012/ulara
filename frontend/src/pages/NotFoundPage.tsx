/**
 * NotFoundPage — the designed 404 surface for routes that don't match.
 *
 * r369 slice B — rebuilt on PublicShell (the T5 focus template): the
 * warm nav + footer, the kit's PageHead with ONE amber underlined word,
 * the line-drawn mk-ill `not-found` scene kept (r280), and the three
 * ways back as world pills. The r313 drafting frame, grain film and
 * mono coordinates are retired grammar; the sr-only «خطأ 404.» carrier
 * stays. The exits: home (primary), the colleges directory (ruling #9,
 * guests land here without the app shell), and login for the returning
 * student whose stale deep-link 404'd (r164b).
 * Reachable via:
 *   - the explicit /404 route (used by the audit harness)
 *   - the catch-all *  route at the end of App.tsx
 */
import { Link } from 'react-router-dom';
import { Glyph } from '../components/icons';
import { Illustration } from '../components/illustrations/Illustration';
import { usePageTitle } from '../hooks/usePageTitle';
import { PublicShell } from '../components/landing/r369/pages/PublicShell';
import { Em, PageHead } from '../components/landing/r369/pages/sections';

export default function NotFoundPage() {
  usePageTitle('الصفحة غير موجودة');
  return (
    <PublicShell>
      <div className="p369-t5">
        <span className="sr-only">خطأ 404.</span>
        <div className="p369-notfound-ill" aria-hidden="true">
          <Illustration name="not-found" />
        </div>
        <PageHead
          n="؟"
          icon="compass"
          kicker="الصفحة غير موجودة"
          title={<>هذه الصفحة <Em>تغيّبت</Em> عن الحضور</>}
          lead="الرابط الذي فتحته لا يطابق أيّ صفحة في أُلارا — ربّما تغيّر عنوانها أو وُرِد بشكل غير دقيق."
          actions={(
            <>
              <Link to="/" className="w369-btn w369-btn-primary">
                العودة إلى الرئيسية
                <Glyph name="arrowLeft" size={16} />
              </Link>
              <Link to="/colleges" className="w369-btn w369-btn-ghost">تصفح الكليات التجريبية</Link>
              <Link to="/auth" className="w369-btn w369-btn-ghost">تسجيل الدخول</Link>
            </>
          )}
        />
      </div>
    </PublicShell>
  );
}
