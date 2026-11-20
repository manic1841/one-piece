import { EASE } from './motion.constants';

export { DURATION } from './motion.constants';

export type Bezier = readonly [number, number, number, number];

/**
 * CSS `cubic-bezier()` in numeric form — `requestAnimationFrame` cannot read a
 * curve mid-flight. Newton first, bisection as the fallback for flat tangents.
 */
export const cubicBezier =
  ([x1, y1, x2, y2]: Bezier) =>
  (progress: number): number => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;

    const ax = 3 * x1 - 3 * x2 + 1;
    const bx = 3 * x2 - 6 * x1;
    const cx = 3 * x1;
    const ay = 3 * y1 - 3 * y2 + 1;
    const by = 3 * y2 - 6 * y1;
    const cy = 3 * y1;

    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
    const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

    let t = progress;
    for (let i = 0; i < 8; i += 1) {
      const offset = sampleX(t) - progress;
      if (Math.abs(offset) < 1e-6) return sampleY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= offset / slope;
    }

    let low = 0;
    let high = 1;
    t = progress;
    for (let i = 0; i < 20; i += 1) {
      const x = sampleX(t);
      if (Math.abs(x - progress) < 1e-6) break;
      if (x < progress) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return sampleY(t);
  };

/** `ease-out-quint`, the token curve for data interpolation and releases. */
export const EASE_OUT_QUINT = cubicBezier(EASE.outQuint);
