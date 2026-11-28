/**
 * R359 final · D-6 — the governance documents register + the PDF
 * upload/download UI (the r352 §12b contract, byte-faithful):
 *
 *   · GovernanceDocuments   the framed register: every document row
 *     with its kind/date facts, a download verb for byte-attached
 *     files (GET /governance/documents/:id/file → Blob → object URL)
 *     and an honest «مرجع خارجي» line for metadata-only rows.
 *   · GovernanceUploadForm  the upload flow: pick a PDF (magic-bytes
 *     + size limits are checked before transfer; the raw route checks the
 *     bytes). Larger files go directly to storage after presigning;
 *     then attach the returned storage key to the council document.
 *
 * Graceful degradation (the A4 merge contract): while the endpoints
 * answer 404/501 the UI stays honest — one Arabic explanation + the
 * metadata-reference path keeps working; nothing pretends.
 */
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Download, FileText, Upload } from 'lucide-react';
import { Icon } from '../Icon';
import { toast } from '../../lib/toast';
import { serverError } from './kit';
import {
  GOVERNANCE_PDF_LIMIT,
  fetchGovernanceDocumentFile,
  uploadGovernancePdf,
  type GovernanceUploadResult,
} from '../../lib/institutional/api';
import type { CouncilDocument } from '../../lib/institutional/types';
import { formatDate } from '../../utils/numbers';

/* ── the download verb ──────────────────────────────────────────── */

function DocumentDownload({ doc }: { doc: CouncilDocument }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const blob = await fetchGovernanceDocumentFile(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.titleAr}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      /* the object URL outlives the click by design (Safari needs the
       * node attached during the click); revoke after the turn. */
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
      toast.success('بدأ تنزيل الملف');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      toast.error(status === 501 || status === 503
        ? 'تنزيل المستند غير متاح على هذا الخادم حاليًا.'
        : serverError(err, 'تعذَّر جلب الملف — أعد المحاولة أو تواصل مع إدارة المؤسسة.'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      className="btn ghost sm"
      onClick={() => void download()}
      disabled={busy}
      aria-label={`تنزيل ${doc.titleAr}`}
    >
      {busy ? <span className="spinner" aria-hidden="true" /> : <Icon icon={Download} size={13} />}
      تنزيل PDF
    </button>
  );
}

/* ── the register ───────────────────────────────────────────────── */

export function GovernanceDocuments({
  documents,
  emptyNote,
}: {
  documents: CouncilDocument[];
  /** The honest empty register note (context-specific). */
  emptyNote?: ReactNode;
}) {
  if (documents.length === 0) {
    return <p className="inst-section-desc">{emptyNote ?? 'لا مستندات مرتبطة بعد.'}</p>;
  }
  return (
    <div className="table-wrap">
      <table className="table tbl-stack" aria-label="مستندات الحوكمة">
        <thead>
          <tr>
            <th scope="col">المستند</th>
            <th scope="col">النوع</th>
            <th scope="col">التاريخ</th>
            <th scope="col">المرفق</th>
            <th scope="col"><span className="sr-only">الإجراء</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => (
            <tr key={d.id}>
              <td data-label="المستند">
                <span className="inst-actions">
                  <Icon icon={FileText} size={14} aria-hidden />
                  <span className="tbl-strong">{d.titleAr}</span>
                </span>
                {d.notes && <span className="inst-tree-kind">{d.notes}</span>}
              </td>
              <td data-label="النوع">{d.kind ?? '—'}</td>
              <td data-label="التاريخ">{formatDate(d.createdAt)}</td>
              <td data-label="المرفق">
                {d.binaryObjectId ? (
                  <span className="sg-flag" data-tone="positive">ملف PDF مرفوع</span>
                ) : d.fileUrl ? (
                  <span className="sg-flag" data-tone="quiet">مرجع خارجي</span>
                ) : (
                  <span className="sg-flag" data-tone="quiet">بيانات وصفية</span>
                )}
              </td>
              <td data-label="الإجراء">
                {d.binaryObjectId ? (
                  <DocumentDownload doc={d} />
                ) : d.fileUrl ? (
                  <a
                    className="btn ghost sm"
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    فتح المرجع
                  </a>
                ) : (
                  <span className="inst-na">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── the upload form ────────────────────────────────────────────── */



export function GovernanceUploadForm({
  onAttached,
  attach,
}: {
  /** Receives the created document (the caller invalidates its queries). */
  onAttached: (doc: CouncilDocument) => void;
  /** Attaches the uploaded storage key as a council document. */
  attach: (upload: GovernanceUploadResult, titleAr: string, kind?: string) => Promise<CouncilDocument>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pick = (f: File | null) => {
    setError(null);
    setFile(null);
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('اختر ملف PDF صالحًا (الخادم يتحقق من بصمة الملف).');
      return;
    }
    if (f.size > GOVERNANCE_PDF_LIMIT) {
      setError('حجم الملف يتجاوز الحد المسموح (500 ميجابايت).');
      return;
    }
    setFile(f);
    if (!title.trim()) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const submit = async () => {
    if (!file) {
      setError('اختر ملف PDF أولًا.');
      return;
    }
    if (!title.trim()) {
      setError('أدخل عنوان المستند.');
      return;
    }
    setBusy(true);
    setProgress(0);
    setError(null);
    try {
      const upload = await uploadGovernancePdf(file, setProgress);
      const doc = await attach(upload, title.trim(), kind.trim() || undefined);
      toast.success('رُفع المستند وارتبط بالمجلس');
      setFile(null);
      setTitle('');
      setKind('');
      if (inputRef.current) inputRef.current.value = '';
      onAttached(doc);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const msg = status === 501 || status === 503 ? '' : serverError(err, err instanceof Error ? err.message : '');
      setError(
        msg ||
          'تعذَّر رفع الملف — ميزة رفع وثائق الحوكمة غير متاحة على هذا الخادم حاليًا؛ استخدم «إضافة مرجع» (بيانات وصفية) أو تواصل مع إدارة المؤسسة.',
      );
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="inst-upload-form">
      <div className="inst-field">
        <label htmlFor="gov-doc-file">ملف PDF (حتى 500 ميجابايت)</label>
        <input
          ref={inputRef}
          id="gov-doc-file"
          type="file"
          accept="application/pdf,.pdf"
          disabled={busy}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="inst-field">
        <label htmlFor="gov-doc-title">عنوان المستند</label>
        <input
          id="gov-doc-title"
          type="text"
          value={title}
          maxLength={160}
          disabled={busy}
          placeholder="مثال: محضر الاجتماع التأسيسي"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="inst-field">
        <label htmlFor="gov-doc-kind">النوع (اختياري)</label>
        <input
          id="gov-doc-kind"
          type="text"
          value={kind}
          maxLength={60}
          disabled={busy}
          placeholder="مثال: محضر"
          onChange={(e) => setKind(e.target.value)}
        />
      </div>
      {busy && progress > 0 && (
        <progress className="inst-upload-progress" value={progress} max={1} aria-label="تقدّم الرفع" />
      )}
      {error && <p className="inst-form-error" role="alert">{error}</p>}
      <div className="inst-dialog-actions">
        <button type="button" className="btn primary sm" disabled={busy} onClick={() => void submit()}>
          {busy ? <span className="spinner" aria-hidden="true" /> : <Icon icon={Upload} size={14} />}
          رفع وإرفاق بالمجلس
        </button>
      </div>
    </div>
  );
}
