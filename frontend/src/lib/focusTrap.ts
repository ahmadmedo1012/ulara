/**
 * Shared Tab focus-trap for modal surfaces (the r37 deadcode round).
 *
 * The Tab-cycling block lived twice — InstFormDialog (kit.tsx) and the
 * SheetNav burger menu — and jscpd counted the 15-line twin. One home
 * now; both call it with their own container ref. The selector is the
 * UNION of both originals (the dialog's full set — the nav menu's
 * links and buttons are a subset, so behavior is unchanged).
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Trap a Tab keypress inside `container`'s focusable elements: focus
 * wraps first↔last. No-op when the container is empty or the key is
 * anything other than Tab. Call from a keydown handler.
 */
export function cycleFocusTrap(
  container: HTMLElement | null | undefined,
  e: { key: string; shiftKey: boolean; preventDefault(): void },
): void {
  if (e.key !== 'Tab') return;
  const items = container?.querySelectorAll<HTMLElement>(FOCUSABLE);
  if (!items || items.length === 0) return;
  const first: HTMLElement | undefined = items[0];
  const last: HTMLElement | undefined = items[items.length - 1];
  if (!first || !last) return;
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
