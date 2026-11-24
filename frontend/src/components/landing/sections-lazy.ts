/* r360 F1 — ONE lazy boundary for the six below-fold sections.
 * Each section stays its own component (the mount-gates keep their
 * per-section rhythm), but the code rides ONE chunk: the per-chunk
 * wrapper overhead of six separate dynamic-import targets measured
 * +25KB gz against the bundle ceiling — the single target loads all
 * six modules in one request (scroll-time, off every boot path). */
export { Chapters } from './sections/Chapters';
export { Product } from './sections/Product';
export { Why } from './sections/Why';
export { Roles } from './sections/Roles';
export { Vision } from './sections/Vision';
export { Footer } from './sections/Footer';
