import { describe, expect, it } from 'vitest';

import { particleCount } from './particleField';

describe('particleCount', () => {
  it('clips to the cheap end on a small field', () => {
    expect(particleCount(40, 40)).toBe(16);
  });

  it('clips to the calm end on a huge field', () => {
    expect(particleCount(2000, 1200)).toBe(90);
  });

  it('stays between the bounds for a normal field', () => {
    const count = particleCount(1200, 400);
    expect(count).toBeGreaterThan(16);
    expect(count).toBeLessThan(90);
  });
});
