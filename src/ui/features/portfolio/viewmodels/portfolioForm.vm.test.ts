import { describe, expect, it } from 'vitest';

import {
  mapPortfolioSnapshotVMToDomain,
  mapPortfolioVMToDomain,
  parsePortfolioFormVM,
  parsePortfolioSnapshotFormVM,
} from './portfolioForm.vm';

describe('portfolioForm.vm', () => {
  it('parses and maps portfolio form to domain input', () => {
    const vm = parsePortfolioFormVM({
      name: 'Retirement',
      description: 'Long term',
      accountIds: ['a1', 'a2'],
      isActive: true,
      order: 1,
    });

    const domain = mapPortfolioVMToDomain(vm);

    expect(domain).toEqual({
      name: 'Retirement',
      description: 'Long term',
      accountIds: ['a1', 'a2'],
      isActive: true,
      order: 1,
    });
  });

  it('parses and maps snapshot form to cashflow payload', () => {
    const vm = parsePortfolioSnapshotFormVM({
      year: 2026,
      month: 3,
      deposits: 1000,
      withdrawals: 200,
    });

    const domain = mapPortfolioSnapshotVMToDomain(vm);

    expect(vm.year).toBe(2026);
    expect(vm.month).toBe(3);
    expect(domain).toEqual({ deposits: 1000, withdrawals: 200 });
  });
});
