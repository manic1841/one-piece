import { describe, expect, it } from 'vitest';

import { NAV_ITEMS } from './navigation';

describe('navigation', () => {
  it('keeps the single source list of every app destination', () => {
    expect(NAV_ITEMS.map((item) => item.to)).toEqual([
      '/',
      '/projects',
      '/accounts',
      '/reports',
      '/close',
      '/transactions',
      '/retirement',
      '/portfolios',
      '/debt',
      '/settings',
    ]);
    expect(NAV_ITEMS).toHaveLength(10);
  });
});
