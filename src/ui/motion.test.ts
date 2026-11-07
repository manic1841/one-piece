import { describe, expect, it } from 'vitest';

import { cubicBezier } from './motion';
import { EASE } from './motion.constants';

const ease = cubicBezier([0.22, 1, 0.36, 1]);

describe('cubicBezier', () => {
  it('pins both ends', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it('clamps outside the unit range', () => {
    expect(ease(-0.5)).toBe(0);
    expect(ease(1.5)).toBe(1);
  });

  it('advances monotonically', () => {
    let previous = 0;
    for (let i = 1; i <= 20; i += 1) {
      const value = ease(i / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('front-loads progress, matching the token curve', () => {
    expect(ease(0.25)).toBeGreaterThan(0.5);
  });
});

describe('exit curve', () => {
  const exit = cubicBezier(EASE.inQuint);

  it('starts slow but is no longer stalled at the halfway mark', () => {
    expect(exit(0.5)).toBeGreaterThan(0.2);
    expect(exit(0.5)).toBeLessThan(0.5);
  });

  it('still lands on the endpoints', () => {
    expect(exit(0)).toBe(0);
    expect(exit(1)).toBe(1);
  });

  it('trails the entry curve over the same elapsed time', () => {
    const entry = cubicBezier(EASE.outQuint);
    for (const at of [0.25, 0.5, 0.75]) {
      expect(exit(at)).toBeLessThan(entry(at));
    }
  });
});

/**
 * M05 is asymmetric: expand is longer because it hands over information. A curve
 * decides how much of that length the eye waits through, so the pair has to stay
 * ordered too — otherwise a front-loaded expand cancels (or inverts) the gap.
 */
describe('disclosure curve pair', () => {
  const expand = cubicBezier(EASE.expand);
  const collapse = cubicBezier(EASE.collapse);

  it('spends the change early on collapse and holds it back on expand', () => {
    for (const at of [0.1, 0.25, 0.5]) {
      expect(expand(at)).toBeLessThan(collapse(at));
    }
  });

  it('leaves most of the expand duration still visible', () => {
    expect(expand(0.25)).toBeLessThan(0.25);
  });

  it('clears most of the collapse change in its first quarter', () => {
    expect(collapse(0.25)).toBeGreaterThan(0.5);
  });
});
