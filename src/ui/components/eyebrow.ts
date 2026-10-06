/**
 * The canonical mono eyebrow for 11px uppercase labels — module labels, metric
 * labels, empty-state titles and other label-class text. `tracking-widest` is
 * deliberate for this label class (design-system §字體排印): do not reuse
 * heading tracking.
 */
export const eyebrowClass = 'font-mono text-[11px] uppercase tracking-widest text-muted-foreground';

/**
 * Section heading (PageSection title). One step above the 11px eyebrow class:
 * 14px, semibold and foreground so a section band reads as a heading rather than
 * another label. Module / eyebrow labels stay on `eyebrowClass`.
 */
export const sectionTitleClass = 'font-mono text-sm font-semibold uppercase text-foreground';
