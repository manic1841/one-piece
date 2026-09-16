import { describe, expect, it } from 'vitest';

import { NAV_ITEMS, getPrimaryNavItems, getSecondaryNavItems } from './navigation';

describe('navigation', () => {
  it('derives four primary tabs and one secondary group from a single list', () => {
    expect(getPrimaryNavItems()).toHaveLength(4);
    expect(getSecondaryNavItems()).toHaveLength(6);
    expect(getPrimaryNavItems().length + getSecondaryNavItems().length).toBe(NAV_ITEMS.length);
  });

  it('keeps Dashboard, Projects, Accounts and Reports as primary tabs', () => {
    expect(getPrimaryNavItems().map((item) => item.to)).toEqual([
      '/',
      '/projects',
      '/accounts',
      '/reports',
    ]);
  });

  it('collects Close, Transactions, Retirement, Portfolios, Debt and Settings in the more sheet', () => {
    expect(getSecondaryNavItems().map((item) => item.to)).toEqual([
      '/close',
      '/transactions',
      '/retirement',
      '/portfolios',
      '/debt',
      '/settings',
    ]);
  });

  it('does not duplicate a destination across primary and secondary groups', () => {
    const primary = new Set(getPrimaryNavItems().map((item) => item.to));
    const secondary = new Set(getSecondaryNavItems().map((item) => item.to));
    const overlap = [...primary].filter((to) => secondary.has(to));

    expect(overlap).toEqual([]);
  });
});
