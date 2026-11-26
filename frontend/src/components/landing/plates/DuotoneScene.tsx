/* DuotoneScene — r364 P1/P2 · the flat-shape kit against the duotone
 * architectural scene (the reference's why/footer collage grammar,
 * measured in docs/redesign/r350/reference shots: shot-why,
 * shot-footer): a high-contrast monochrome architectural scene with a
 * lone human figure, composed against BOLD FLAT signal geometry — a
 * large solid royal circle cropped by the frame, a tall solid royal
 * slab, a pale paper-tint circle behind the scene, thin royal
 * construction lines. ORIGINAL art (frontend/src/assets/art-v2),
 * ULARA's university world; the reference's flat-shape construction
 * rebuilt, nothing copied.
 *
 * Variants:
 *  · "stage"  — the why band's hero imagery: the scene fills a wide
 *    plate, the circle overlaps its reading-start edge, the slab rides
 *    the far edge, the pale circle sits behind-left.
 *  · "strip"  — the footer's ink band: a wide low strip, the circle
 *    cropped by its top edge, the slab at the far edge.
 *
 * Colour law: every paint flows the grammar seats — ink via the
 * --duo-ink seat, the signal via var(--accent) (the owner's royal
 * blue), the pale circle via the paper-tint seat. Dark theme: the
 * same seats invert with the paper (the scene keeps its grayscale
 * treatment; the pale circle flips to the dark paper tint).
 * Motion: none of its own — the sections' reveal grammar drives the
 * band's entrance; reduced motion shows the settled composition.
 */
import { Icon } from '../../Icon';
import { MoveDownLeft } from 'lucide-react';

export type DuoVariant = 'stage' | 'strip' | 'pane';

export function DuotoneScene({
  src,
  alt,
  variant = 'stage',
  caption,
  note,
  flat = false,
}: {
  src: string;
  alt: string;
  variant?: DuoVariant;
  caption?: string;
  note?: string;
  /** r368: a procedural cut-out scene (transparent ground, no photo filter) */
  flat?: boolean;
}) {
  return (
    <figure className={`duo-scene duo-${variant}`} data-variant={variant}>
      {/* the flat-shape kit — BEHIND and THROUGH the scene, the
          reference's own composition order (pale circle behind, signal
          shapes against, construction lines over) */}
      <span className="fs-circle-pale" aria-hidden="true" />
      <span className="fs-slab" aria-hidden="true" />
      <span className="fs-circle-royal" aria-hidden="true" />
      <span className="fs-line fs-line-a" aria-hidden="true" />
      <span className="fs-line fs-line-b" aria-hidden="true" />

      {/* the scene — grayscale/contrast treatment seats in CSS so the
          theme drives it; the img carries the real alt (the figure and
          the building ARE content) */}
      <img className={`duo-img${flat ? ' is-flat' : ''}`} src={src} alt={alt} loading="lazy" decoding="async" />

      {/* the caption row — mono datum + the survey arrow, the sheet's
          own furniture at the foot */}
      {(caption || note) && (
        <figcaption className="duo-cap">
          {caption && <span className="duo-cap-t fo-mono" dir="ltr">[{caption}]</span>}
          {note && <span className="duo-cap-note">{note}</span>}
          <Icon icon={MoveDownLeft} size={14} aria-hidden="true" />
        </figcaption>
      )}
    </figure>
  );
}
