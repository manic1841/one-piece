/**
 * The canonical mono eyebrow for 11px uppercase labels — module labels, metric
 * labels, empty-state titles and other label-class text. `tracking-widest` is
 * deliberate for this label class (design-system §字體排印): do not reuse
 * heading tracking.
 */
export const eyebrowClass = 'font-mono text-[11px] uppercase tracking-widest text-muted-foreground';

/**
 * Sub-section heading: a label that names one block *inside* a page section
 * (a metric group, a statement view, an account category strip). One step above
 * `eyebrowClass` so it reads as a heading, one below `sectionTitleClass` so the
 * two layers cannot flatten into each other (design-system §字體排印).
 */
export const subSectionTitleClass = 'font-mono text-[13px] font-semibold uppercase text-foreground';

/**
 * Page-section heading (a `PageSection` title). One step above the 13px
 * sub-section class: 14px, semibold and foreground so the band reads as the
 * page's own structure rather than another label.
 */
export const sectionTitleClass = 'font-mono text-sm font-semibold uppercase text-foreground';
