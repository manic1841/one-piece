/**
 * Single home for motion values (motion-system §2). `tailwind.config.js` builds
 * the token scale from this table, and rAF-driven code reads the same numbers —
 * a value can no longer drift between CSS and JS.
 */
export const DURATION = {
  fast: 120,
  base: 240,
  slow: 400,
  data: 400,
  // Expansion hands over new information and has to be readable, so it is the
  // longer half. Collapsing removes information and can be blunter (M05).
  expand: 220,
  collapse: 170,
} as const;

export const EASE = {
  outQuint: [0.22, 1, 0.36, 1],
  // Entry curve. `outQuint` pushes ~90% of the change into the first quarter of
  // its duration, which at 240ms reads as a hard cut. This one spends the change
  // over the first three quarters and leaves a soft tail, so the same motion is
  // legible at a longer duration.
  outSettle: [0.3, 0.9, 0.4, 1],
  // Disclosure pair (M05). A curve decides how much of the configured duration
  // the eye actually waits through, so the two halves must be ordered: expand
  // holds back (~14% of the change at a quarter of its time) and collapse spends
  // it early (~64% at the same point). Reusing `outSettle` in both directions
  // cancels the 50ms length gap, and `inQuint` on the way out makes the shorter
  // half read as the longer one.
  expand: [0.35, 0, 0.6, 1],
  collapse: [0.25, 0.8, 0.4, 1],
  // Gentler than a literal `ease-in-quint` (0.75, 0, 0.85, 0.4), which keeps the
  // first three quarters of the exit almost frozen and then spends everything in
  // the last 100ms. Exits still start slow, but no longer stall.
  inQuint: [0.4, 0, 0.7, 0.4],
} as const satisfies Record<string, readonly [number, number, number, number]>;
