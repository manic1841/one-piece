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
} as const;

export const EASE = {
  outQuint: [0.22, 1, 0.36, 1],
  // Gentler than a literal `ease-in-quint` (0.75, 0, 0.85, 0.4), which keeps the
  // first three quarters of the exit almost frozen and then spends everything in
  // the last 100ms. Exits still start slow, but no longer stall.
  inQuint: [0.4, 0, 0.7, 0.4],
} as const satisfies Record<string, readonly [number, number, number, number]>;
