/**
 * feedbackSeat — r351 A2 (Q1f): the feedback surface's open channel.
 *
 * The floating FAB is retired (it covered content on every measured
 * width — r350's offset fix never cleared the intersections). The
 * surface now opens from the topbar user menu and the ⌘K command
 * palette; both fire this tiny pub/sub instead of importing the widget
 * (no store edits, no new context — a CustomEvent the widget owns).
 */
const FEEDBACK_OPEN_EVENT = 'ulara:feedback-open';

/** Open the feedback sheet from any chrome control. */
export function openFeedback(): void {
  window.dispatchEvent(new CustomEvent(FEEDBACK_OPEN_EVENT));
}

/** Subscribe to open requests; returns the unsubscribe function. */
export function onOpenFeedback(cb: () => void): () => void {
  const handler = () => cb();
  window.addEventListener(FEEDBACK_OPEN_EVENT, handler);
  return () => window.removeEventListener(FEEDBACK_OPEN_EVENT, handler);
}
