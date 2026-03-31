import { describe, expect, it } from 'vitest';

import {
  addHoldingToForm,
  applyDisplayFieldChange,
  applyImportedHoldings,
  createSnapshotEditorFormVM,
  removeHoldingFromForm,
  updateHoldingInForm,
} from '@/ui/features/account/viewmodels/accountSnapshotEditor.vm';

describe('accountSnapshotEditor.vm', () => {
  it('creates default form vm', () => {
    const vm = createSnapshotEditorFormVM();
    expect(vm.month).toBeGreaterThanOrEqual(1);
    expect(vm.month).toBeLessThanOrEqual(12);
    expect(vm.exchangeRate).toBe(1);
    expect(vm.holdings).toEqual([]);
  });

  it('recalculates amount for non-securities in foreign currency', () => {
    const vm = {
      year: 2026,
      month: 3,
      amount: 0,
      originalAmount: 100,
      exchangeRate: 30,
      holdings: [],
    };

    const next = applyDisplayFieldChange(vm, 'exchangeRate', 31, {
      isSecurities: false,
      currency: 'USD',
    });

    expect(next.amount).toBe(3100);
  });

  it('syncs original amount when non-securities TWD balance changes', () => {
    const vm = {
      year: 2026,
      month: 3,
      amount: 0,
      originalAmount: 0,
      exchangeRate: 1,
      holdings: [],
    };

    const next = applyDisplayFieldChange(vm, 'amount', 1200, {
      isSecurities: false,
      currency: 'TWD',
    });

    expect(next.amount).toBe(1200);
    expect(next.originalAmount).toBe(1200);
    expect(next.exchangeRate).toBe(1);
  });

  it('recalculates securities totals from holdings', () => {
    const base = {
      year: 2026,
      month: 3,
      amount: 0,
      originalAmount: 0,
      exchangeRate: 32,
      holdings: [
        { symbol: 'AAA', name: 'A', quantity: 1, cost: 10, marketValue: 100, leverage: 1 },
        { symbol: 'BBB', name: 'B', quantity: 1, cost: 20, marketValue: 200, leverage: 1 },
      ],
    };

    const next = updateHoldingInForm(base, 0, 'marketValue', '150', {
      isSecurities: true,
      currency: 'USD',
    });

    expect(next.originalAmount).toBe(350);
    expect(next.amount).toBe(11200);
  });

  it('adds and removes holdings', () => {
    const vm = {
      year: 2026,
      month: 3,
      amount: 0,
      originalAmount: 0,
      exchangeRate: 1,
      holdings: [],
    };

    const added = addHoldingToForm(vm);
    expect(added.holdings).toHaveLength(1);

    const removed = removeHoldingFromForm(added, 0, {
      isSecurities: true,
      currency: 'TWD',
    });
    expect(removed.holdings).toHaveLength(0);
  });

  it('applies imported holdings and recalculates totals', () => {
    const vm = {
      year: 2026,
      month: 3,
      amount: 0,
      originalAmount: 0,
      exchangeRate: 30,
      holdings: [],
    };

    const next = applyImportedHoldings(
      vm,
      [
        { symbol: 'AAPL', name: 'Apple', quantity: 1, cost: 100, marketValue: 120, leverage: 1 },
        {
          symbol: 'MSFT',
          name: 'Microsoft',
          quantity: 1,
          cost: 200,
          marketValue: 210,
          leverage: 1,
        },
      ],
      {
        isSecurities: true,
        currency: 'USD',
      },
    );

    expect(next.originalAmount).toBe(330);
    expect(next.amount).toBe(9900);
    expect(next.holdings).toHaveLength(2);
  });
});
