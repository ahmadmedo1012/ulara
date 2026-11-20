/**
 * PainSim — R344-LS2 — the pains' measurement furniture layer.
 *
 * The section's census art seat (problem.artsvg.N → PainArt) keeps its
 * motif drawings untouched; THIS component mounts the second svg that
 * turns each motif into a measured simulation:
 *
 *   01 LECTURE  — the measuring ruler the lecture never reaches +
 *                 the empty-trace tag («TRACE Ø»);
 *   02 GRADING  — the day-count rail the correction travels (D+1…D+14)
 *                 + the LATE stamp;
 *   03 MASTERY  — the axis arrows + the gap question mark (the cell
 *                 the map cannot name) + the measure frame tags;
 *   04 ARCHIVE  — the drawer's broken index tabs + the «IDX —» tag
 *                 (the index the paper trail never lands in).
 *
 * Everything here is decorative chrome (aria-hidden) in the sheet's own
 * ink classes; the draw-in choreography lives in pains.css keyed on the
 * column's reveal state (.pm-col.in-view). Reduced motion: the global
 * belt collapses the animations to their end state (content ships
 * visible — the furniture never hides behind a one-shot).
 */
export function PainSim({ kind }: { kind: '01' | '02' | '03' | '04' }) {
  return (
    <svg
      className="pm-xart"
      viewBox="0 0 200 200"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {kind === '01' && (
        <>
          {/* the measuring ruler — the instrument the lecture's trace
              never reaches (right edge, full height ticks) */}
          <line className="bp-hair pm-x pm-x-late" pathLength={1} x1="178" y1="26" x2="178" y2="192" />
          {[36, 60, 84, 108, 132, 156, 180].map((y, i) => (
            <line
              key={`t${i}`}
              className="bp-hair pm-x pm-x-tick"
              pathLength={1}
              x1="178"
              y1={y}
              x2={i % 2 === 0 ? 186 : 182}
              y2={y}
              style={{ ['--pd' as string]: `${140 + i * 70}ms` }}
            />
          ))}
          {/* the empty-trace tag — the measurement that finds nothing */}
          <g className="pm-x pm-x-tag" style={{ ['--pd' as string]: '700ms' }}>
            <rect className="bp-hair" x="150" y="170" width="34" height="14" />
            <text className="pm-x-t" x="167" y="180" textAnchor="middle">TRACE Ø</text>
          </g>
        </>
      )}
      {kind === '02' && (
        <>
          {/* the day rail — the correction's journey across the weeks */}
          <line className="bp-hair pm-x" pathLength={1} x1="18" y1="192" x2="182" y2="192" />
          {[18, 46, 74, 102, 130, 158, 182].map((x, i) => (
            <line
              key={`d${i}`}
              className="bp-hair pm-x pm-x-tick"
              pathLength={1}
              x1={x}
              y1="188"
              x2={x}
              y2="196"
              style={{ ['--pd' as string]: `${120 + i * 80}ms` }}
            />
          ))}
          {/* the LATE stamp — the deadline the stack outlives */}
          <g className="pm-x pm-x-stamp" style={{ ['--pd' as string]: '760ms' }}>
            <rect className="pm-x-stamp-box" x="118" y="120" width="52" height="18" />
            <text className="pm-x-t pm-x-t-accent" x="144" y="132" textAnchor="middle">D+14</text>
          </g>
        </>
      )}
      {kind === '03' && (
        <>
          {/* the axis arrows — the map's unlabelled directions */}
          <g className="pm-x">
            <line className="bp-hair pm-x-arrow" pathLength={1} x1="176" y1="30" x2="176" y2="16" />
            <path className="bp-hair pm-x-arrow" pathLength={1} d="M172 20 L176 14 L180 20" />
            <line className="bp-hair pm-x-arrow" pathLength={1} x1="176" y1="30" x2="190" y2="30" />
            <path className="bp-hair pm-x-arrow" pathLength={1} d="M186 26 L192 30 L186 34" />
          </g>
          {/* the gap's question mark — the concept the score cannot name */}
          <g className="pm-x pm-x-gap" style={{ ['--pd' as string]: '680ms' }}>
            <text className="pm-x-t pm-x-t-accent pm-x-t-big" x="110" y="112" textAnchor="middle">؟</text>
          </g>
          {/* the measure tags — counted cells vs the unnamed one */}
          <g className="pm-x pm-x-tag" style={{ ['--pd' as string]: '820ms' }}>
            <rect className="bp-hair" x="128" y="166" width="48" height="14" />
            <text className="pm-x-t" x="152" y="176" textAnchor="middle">MAP 8/9</text>
          </g>
        </>
      )}
      {kind === '04' && (
        <>
          {/* the drawer's index tabs — one filed, one broken away */}
          <line className="bp-hair pm-x" pathLength={1} x1="88" y1="52" x2="180" y2="52" />
          <rect className="bp-hair pm-x pm-x-tab" pathLength={1} x="140" y="46" width="22" height="12" />
          <g className="pm-x pm-x-tab-broken" style={{ ['--pd' as string]: '560ms' }}>
            <path className="bp-hair" d="M96 44 L114 40 L112 54 L94 56 Z" />
          </g>
          {/* the lost-index tag */}
          <g className="pm-x pm-x-tag" style={{ ['--pd' as string]: '780ms' }}>
            <rect className="bp-hair" x="16" y="170" width="44" height="14" />
            <text className="pm-x-t" x="38" y="180" textAnchor="middle">IDX —</text>
          </g>
        </>
      )}
    </svg>
  );
}
