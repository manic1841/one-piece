import { describe, expect, it } from 'vitest';

import { mapBalanceSheetToVM, mapCashFlowToVM, mapIncomeStatementToVM } from './reportDisplay.vm';

describe('reportDisplay.vm', () => {
  it('maps income statement to display vm', () => {
    const vm = mapIncomeStatementToVM({
      yearMonth: '2026-03',
      incomeTotal: 1000,
      expenseTotal: 400,
      netIncome: 600,
      incomeItems: [{ code: 'income:salary', label: '薪資', amount: 1000 }],
      expenseItems: [{ code: 'expense:food', label: '餐飲', amount: 400 }],
    });

    expect(vm.incomeTotal).toBe(1000);
    expect(vm.incomeTotalText).toContain('1,000');
    expect(vm.incomeItems[0]?.amountText).toContain('1,000');
  });

  it('maps balance sheet to display vm', () => {
    const vm = mapBalanceSheetToVM({
      yearMonth: '2026-03',
      assets: {
        total: 5000,
        groups: {
          current: {
            label: '流動資產',
            total: 5000,
            items: [{ code: 'asset:cash', label: '現金', amount: 5000 }],
          },
        },
      },
      liabilities: {
        total: 1000,
        groups: {
          current: {
            label: '流動負債',
            total: 1000,
            items: [{ code: 'liability:card', label: '信用卡', amount: 1000 }],
          },
        },
      },
      equity: {
        total: 4000,
        groups: {
          capital: {
            label: '資本',
            total: 4000,
            items: [{ code: 'equity:capital', label: '期末權益', amount: 4000 }],
          },
        },
      },
    });

    expect(vm.assets.totalText).toContain('5,000');
    expect(vm.assets.groups.current?.items[0]?.amountText).toContain('5,000');
    expect(vm.equity.total).toBe(4000);
  });

  it('maps cash flow to display vm', () => {
    const vm = mapCashFlowToVM({
      yearMonth: '2026-03',
      operating: {
        label: '營業活動',
        total: 200,
        inflowItems: [{ code: 'income:salary', label: '薪資', amount: 500 }],
        outflowItems: [{ code: 'expense:food', label: '餐飲', amount: 300 }],
      },
      investing: {
        label: '投資活動',
        total: -100,
        inflowItems: [],
        outflowItems: [{ code: 'asset:buy', label: '買進', amount: 100 }],
      },
      financing: {
        label: '融資活動',
        total: 0,
        inflowItems: [],
        outflowItems: [],
      },
      netCashChange: 100,
      beginningBalance: 1000,
      endingBalance: 1100,
      actualBalance: 1100,
      adjustment: 0,
    });

    expect(vm.netCashChangeText).toContain('100');
    expect(vm.beginningBalanceText).toContain('1,000');
    expect(vm.operating.inflowItems[0]?.amountText).toContain('500');
  });
});
