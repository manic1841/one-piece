/** One particle per this many CSS px², clipped so the field stays sparse and cheap. */
const AREA_PER_PARTICLE = 9_000;
const MIN_PARTICLES = 16;
const MAX_PARTICLES = 90;

/** Retina is worth it, 3× phones are not. */
export const MAX_DPR = 2;

export const SPEED = 0.06;
export const RADIUS = { min: 0.9, max: 1.8 };

/** Density rule, kept out of the component so the cap is assertable without a canvas. */
export const particleCount = (width: number, height: number): number =>
  Math.round(
    Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, (width * height) / AREA_PER_PARTICLE)),
  );
