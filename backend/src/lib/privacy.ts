import { createHash } from 'node:crypto';

/**
 * Stable pseudonymous reference for an email address in server logs.
 *
 * r370 (privacy): the auth paths logged raw email addresses
 * (`password reset requested for unknown email`, `token minted`,
 * `mail send failed`). A structured log stream is copied, shipped and
 * retained far more liberally than the database — an email address in it
 * is personal data with no redaction ceiling, and the reset flow's own
 * design (a generic 200 for every address) exists precisely so the
 * address is never observable. Logging it undid that intent in the one
 * artifact nobody audits.
 *
 * The reference keeps the ONE thing ops actually needs — correlating two
 * log lines about the same address — while disclosing nothing: the same
 * normalized address always hashes to the same short digest, and the
 * digest cannot be turned back into the address without already having
 * it. Not a secret-keyed HMAC on purpose: rotating a log salt would
 * break correlation across the rotation for no gain here.
 */
export function emailLogRef(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return 'email:unknown';
  const digest = createHash('sha256').update(normalized).digest('hex').slice(0, 12);
  return `email:sha256:${digest}`;
}
