import { describe, expect, it } from 'vitest';

import { NAV_ITEMS, getNavigatorItems } from './navigation';

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
  });

  it('exposes every destination to the pet navigator without exclusions', () => {
    expect(getNavigatorItems().map((item) => item.to)).toEqual(NAV_ITEMS.map((item) => item.to));
    expect(getNavigatorItems()).toHaveLength(10);
  });
});
