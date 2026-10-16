import { describe, expect, it } from 'vitest';

import {
  type RetirementBaselineCategory,
  type RetirementBaselineItem,
  type RetirementBaselineRowVM,
  filterRetirementBaselineItems,
  mapRetirementExpenseToBaselineRow,
  mapRetirementIncomeToBaselineRow,
  mapRetirementPlanToBaselineItems,
} from './retirementBaseline.vm';

const RETIREMENT_YEAR = 2046; // birthYear 1986 + retirementAge 60

const row = (id: string, category: RetirementBaselineCategory): RetirementBaselineRowVM => ({
  id,
  category,
  name: id,
  sourceText: '—',
  baseAmountText: '—',
  growthText: 'Inflation',
  endConditionText: '持續至預期壽命',
  isReadOnly: false,
});

const item = (id: string, category: RetirementBaselineCategory): RetirementBaselineItem =>
  ({
    kind: category === 'income' ? 'income' : 'expense',
    vm: row(id, category),
  }) as RetirementBaselineItem;

describe('retirementBaseline.vm', () => {
  it('maps an imported income: ledger code as source, derived amount and end condition', () => {
    const mapped = mapRetirementIncomeToBaselineRow(
      {
        id: 'i1',
        name: '薪資',
        type: 'salary',
        lifelong: false,
        startYear: 2026,
        endYear: RETIREMENT_YEAR,
        currentAnnual: 120000,
        growthRate: 2,
        calculatedFrom: {
          ledgerCode: 'income:salary',
          sampleYear: 2025,
          totalAmount: 120000,
          monthlyAverage: 10000,
          sampleCount: 12,
          importedAt: '2026-01-01T00:00:00.000Z',
        },
      },
      RETIREMENT_YEAR,
    );

    expect(mapped).toMatchObject({
      id: 'i1',
      category: 'income',
      name: '薪資',
      sourceText: 'income:salary',
      growthText: '2% growth',
      endConditionText: '退休時結束',
      isReadOnly: false,
    });
    expect(mapped.baseAmountText).toContain('120,000');
  });

  it('prefers incomeCategory over the raw ledger code and reads lifelong back as 持續至預期壽命', () => {
    const mapped = mapRetirementIncomeToBaselineRow(
      {
        id: 'i2',
        name: 'Rent',
        type: 'rent',
        lifelong: true,
        startYear: 2026,
        currentAnnual: 60000,
        incomeCategory: 'income:rent',
      },
      RETIREMENT_YEAR,
    );

    expect(mapped.sourceText).toBe('income:rent');
    expect(mapped.endConditionText).toBe('持續至預期壽命');
    expect(mapped.isReadOnly).toBe(false);
  });

  it('keeps a scenario-only income but marks it read-only with no source or amount', () => {
    const mapped = mapRetirementIncomeToBaselineRow(
      {
        id: 'i3',
        name: 'Legacy',
        type: 'other',
        lifelong: true,
        startYear: 2026,
        currentAnnual: null,
      },
      RETIREMENT_YEAR,
    );

    expect(mapped).toMatchObject({
      category: 'income',
      baseAmountText: '—',
      sourceText: '—',
      isReadOnly: true,
    });
  });

  it('maps a general expense with a specific end year and falling back to plan inflation growth', () => {
    const mapped = mapRetirementExpenseToBaselineRow(
      {
        id: 'e1',
        name: '生活費',
        type: 'general',
        includesPrincipal: false,
        interestOnly: false,
        currentAnnual: 50000,
        retirementMultiplier: 1,
        startYear: 2026,
        endYear: 2055,
        expenseCategory: 'expense:living',
      },
      RETIREMENT_YEAR,
    );

    expect(mapped).toMatchObject({
      category: 'expense',
      sourceText: 'expense:living',
      growthText: 'Inflation',
      endConditionText: '指定年份 2055',
      isReadOnly: false,
    });
  });

  it('categorises debt repayment rows separately and uses the debt account as the source', () => {
    const mapped = mapRetirementExpenseToBaselineRow(
      {
        id: 'e2',
        name: '房貸',
        type: 'debt_payment',
        sourceDebtAccountId: 'debt-1',
        includesPrincipal: true,
        interestOnly: false,
        currentAnnual: 240000,
        retirementMultiplier: 1,
        startYear: 2026,
        endYear: 2035,
      },
      RETIREMENT_YEAR,
    );

    expect(mapped.category).toBe('debt');
    expect(mapped.sourceText).toBe('debt-1');
  });

  it('maps a plan into incomes followed by expenses', () => {
    const items = mapRetirementPlanToBaselineItems({
      birthYear: 1986,
      retirementAge: 60,
      incomes: [
        {
          id: 'i1',
          name: 'A',
          type: 'salary',
          lifelong: false,
          startYear: 2026,
          endYear: RETIREMENT_YEAR,
          currentAnnual: 1,
        },
      ],
      expenses: [
        {
          id: 'e1',
          name: 'B',
          type: 'general',
          includesPrincipal: false,
          interestOnly: false,
          currentAnnual: 2,
          retirementMultiplier: 1,
          startYear: 2026,
          endYear: null,
        },
      ],
    });

    expect(items.map((entry) => entry.vm.id)).toEqual(['i1', 'e1']);
    expect(items[1].vm.endConditionText).toBe('持續至預期壽命');
  });

  it('filters baseline items by category', () => {
    const items = [item('i1', 'income'), item('e1', 'expense'), item('d1', 'debt')];

    expect(filterRetirementBaselineItems(items, 'all')).toHaveLength(3);
    expect(filterRetirementBaselineItems(items, 'expense').map((entry) => entry.vm.id)).toEqual([
      'e1',
    ]);
    expect(filterRetirementBaselineItems(items, 'debt').map((entry) => entry.vm.id)).toEqual([
      'd1',
    ]);
  });
});
