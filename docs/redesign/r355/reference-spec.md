# Reference Match Specification (R355)

## 1. Overview & Extraction Method
This specification extracts the visual presentation, motion dynamics, typography scale, spatial rhythm, and isometric geometry from the reference design system, mapped strictly to ULARA's Arabic-first token system.
Under operating rule 6: The visual reference is referred to exclusively as "the reference". No personal names or trademarks are used.

## 2. Core Tokens & Spacing System
| Metric | Reference Measurement | ULARA Token Mapping | Allowed Tolerance |
|---|---|---|---|
| Container Max Width (Desktop) | 1360px – 1440px | `--container-max: 1400px` | ±20px |
| Section Vertical Padding (Desktop) | 96px – 128px | `--space-section-desktop: 112px` | ±8px |
| Section Vertical Padding (Mobile) | 56px – 72px | `--space-section-mobile: 64px` | ±8px |
| Card Padding | 24px – 32px | `--card-p: var(--space-6)` | ±4px |
| Grid Gap | 20px – 32px | `--grid-gap: var(--space-6)` | ±4px |
| Corner Radii (Cards) | 16px – 24px | `--radius-lg: 20px` | ±2px |
| Corner Radii (Buttons) | 9999px (pill) / 12px | `--radius-pill: 9999px` | exact |

## 3. Typography Scale & Hierarchy (Arabic RTL Adapted)
| Element | Reference Role | ULARA Arabic Font & Weight | Font Size | Line Height Floor |
|---|---|---|---|---|
| Display / Hero | Display Title | Alexandria (700 Bold) | 48px – 64px | `max(1.2, 1.35)` |
| Section Title | H2 Title | Alexandria (600 SemiBold) | 32px – 40px | `max(1.25, 1.35)` |
| Subsection Title | H3 Card Header | Alexandria (600 SemiBold) | 20px – 24px | `max(1.3, 1.4)` |
| Body Large | Lead Paragraph | Alexandria / IBM Plex Arabic (400) | 18px | 1.6 |
| Body Default | Standard Copy | Alexandria / IBM Plex Arabic (400) | 15px – 16px | 1.6 |
| Caption / Label | Meta & Tags | Alexandria / IBM Plex Arabic (500) | 12px – 13px | 1.5 |

## 4. Color Hierarchy & Ratios
| Role | Reference Characteristic | ULARA Token | Hex (Light / Dark) |
|---|---|---|---|
| Primary Accent | Royal Electric Blue | `var(--accent)` | `#2540D9` / `#8AA0FF` |
| Secondary Accent | Warm Coral (Decorative) | `var(--c-copper-ink)` (≡ `--c-peach-ink` / `--c-coral-ink`) | `#F15534` / `#FF8E68` |
| Surface Background | Crisp Neutral Layer | `var(--bg-canvas)` | `#F8FAFC` / `#0B0F19` |
| Surface Elevated | Clean Contrast Card | `var(--bg-surface)` | `#FFFFFF` / `#131B2E` |
| Border / Stroke | Crisp Definition | `var(--border-subtle)` | `rgba(0,0,0,0.08)` / `rgba(255,255,255,0.1)` |

R355 reconciliation (code wins over docs — AGENTS.md §1): the original
extraction row named the reference's warm sienna `#D97706`/`#FBBF24` under a
never-implemented `--accent-secondary` seat. The 2026-11-21 owner-approved
«Parchment & Royal» palette retired the sienna/ember hexes (#C43E16/#FF6B3D)
from every brand seat; the warm secondary survives strictly as the DECORATIVE
coral family (`--c-copper-*`/`--c-peach-*`/`--c-coral-*`: bg `#FCE5DE`/`#43241C`,
ink `#F15534`/`#FF8E68`, deep `#9C2B0F`/`#FFC5AE`) — never a primary, link,
button, or danger tone. The royal `var(--accent)` remains the ONE primary
signal in both themes (6.62:1 on paper / 6.56:1 on the night ground, AA).

## 5. Motion & Choreography
| Animation | Easing Curve | Duration | Stagger |
|---|---|---|---|
| Page Intro / Hero Entry | `cubic-bezier(0.16, 1, 0.3, 1)` | 800ms | 80ms per layer |
| Card Reveal (Scroll) | `cubic-bezier(0.25, 1, 0.5, 1)` | 600ms | 100ms per child |
| Hover / Micro-interaction | `cubic-bezier(0.4, 0, 0.2, 1)` | 200ms – 250ms | 0ms |
| Modal / Drawer Slide | `cubic-bezier(0.32, 0.72, 0, 1)` | 350ms | 0ms |

## 6. Isometric & Plate Grammar
- **Perspective Angle:** True isometric $30^\circ$ baseline or axonometric projection.
- **Stroke Weights:** 1.5px on desktop, 1.25px on mobile, crisp non-scaling stroke.
- **Lighting Model:** Light source top-left/top-center, depth via subtle gradient fills (`linear-gradient(180deg, ...)`), soft shadow layers (`drop-shadow(0 12px 24px rgba(37,64,217,0.12))`).
- **No Raster / Bitmaps:** 100% SVG/TSX vector components with theme token bindings.
