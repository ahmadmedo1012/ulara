/**
 * r359/lib/runtime.tsx — the web renderer for the shared art grammar.
 *
 * Renders an ArtDoc (pure data from @shared/art) into accessible,
 * theme-aware, optionally-animated inline SVG:
 *   · viewBox-based, width 100% / aspect-ratio reserved (no CLS)
 *   · role="img" + <title> (Arabic default, `title` prop overrides)
 *   · colors ride the --r359-* custom properties (illustrations.css
 *     maps them onto house tokens; `theme` prop forces a palette)
 *   · `animated` enables the grammar's motion register: stroke
 *     draw-in, slow dash flow, ±1px drift — nothing else (no springs,
 *     no bounce; the global reduced-motion belt zeroes it)
 */
import { memo, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { ArtBuilder, ArtDoc, ArtNode, ArtPlateProps } from '@shared/art/grammar';

/* kebab-case attr → React camelCase prop (our controlled vocabulary) */
const CAMEL: Record<string, string> = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-opacity': 'strokeOpacity',
  'font-size': 'fontSize',
  'font-family': 'fontFamily',
  'font-weight': 'fontWeight',
  'text-anchor': 'textAnchor',
  'letter-spacing': 'letterSpacing',
  'dominant-baseline': 'dominantBaseline',
};

function propsOf(n: ArtNode): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(n.a ?? {})) {
    if (k === 'class') out.className = v as string;
    else out[CAMEL[k] ?? k] = v;
  }
  // draw-in needs normalized path length (CSS handles the dash)
  if (out['data-a'] === 'draw' && n.t !== 'g' && n.t !== 'text') out.pathLength = 1;
  return out;
}

function renderNode(n: ArtNode, i: number): ReactNode {
  const p = propsOf(n);
  if (n.t === 'text') return <text key={i} {...p}>{n.s}</text>;
  if (n.c === undefined || n.c.length === 0) {
    const T = n.t as 'path';
    return <T key={i} {...p} />;
  }
  const T = n.t as 'g';
  return <T key={i} {...p}>{n.c.map(renderNode)}</T>;
}

export interface ArtSvgProps extends ArtPlateProps {
  build: ArtBuilder;
}

function ArtSvgBase({ build, className, title, animated, theme }: ArtSvgProps): React.JSX.Element {
  const doc: ArtDoc = useMemo(() => build(), [build]);
  const t = title ?? doc.title;
  const cls = ['mk-r359', className].filter(Boolean).join(' ');
  const style = { '--r359-ar': `${doc.w} / ${doc.h}` } as CSSProperties;

  return (
    <svg
      className={cls}
      data-art-theme={theme}
      data-anim={animated === true ? 'on' : undefined}
      viewBox={`0 0 ${doc.w} ${doc.h}`}
      role="img"
      aria-label={t}
      style={style}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{t}</title>
      {doc.nodes.map(renderNode)}
    </svg>
  );
}

export const ArtSvg = memo(ArtSvgBase);
