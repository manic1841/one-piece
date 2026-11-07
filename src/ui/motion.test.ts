import { describe, expect, it } from 'vitest';

import { EASE } from './motion.constants';
import { cubicBezier } from './motion';

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
