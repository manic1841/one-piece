import { z } from 'zod';

import { CashFlowCategory, type CashFlowData, CashFlowItemSchema } from '@/domains/finance/types';
import type { ProjectWithSnapshot } from '@/domains/project/types';

type CashFlowItem = z.infer<typeof CashFlowItemSchema>;

/**
 * Calculate Cash Flow Statement
 * Operating, Investing, Financing based on project.accounting.cashFlow
 */
export function calculateCashFlowStatement(
  projectsWithSnapshots: ProjectWithSnapshot[],
  beginningCash: number,
): CashFlowData {
  const operatingIncome: CashFlowItem[] = [];
  const operatingExpense: CashFlowItem[] = [];
  const investingIncome: CashFlowItem[] = [];
  const investingExpense: CashFlowItem[] = [];
  const financingIncome: CashFlowItem[] = [];
  const financingExpense: CashFlowItem[] = [];

  // Helper to aggregate
  const aggregate = (items: CashFlowItem[], category: string, amount: number) => {
    const existing = items.find((i) => i.category === category);
    if (existing) {
      existing.amount += amount;
    } else {
      items.push({ category, amount });
    }
  };

  projectsWithSnapshots.forEach((pws) => {
    const project = pws;
    const snapshot = pws.snapshot;
    if (!project || !snapshot) return;

    if (project?.accounting?.cashFlow) {
      const { category, subcategory } = project.accounting.cashFlow;
      const income = snapshot.income;
      const expense = snapshot.expense;

      // 分別處理收入和支出
      if (category === CashFlowCategory.OPERATING) {
        if (income > 0) aggregate(operatingIncome, subcategory, income);
        if (expense > 0) aggregate(operatingExpense, subcategory, expense);
      } else if (category === CashFlowCategory.INVESTING) {
        if (income > 0) aggregate(investingIncome, subcategory, income);
        if (expense > 0) aggregate(investingExpense, subcategory, expense);
      } else if (category === CashFlowCategory.FINANCING) {
        if (income > 0) aggregate(financingIncome, subcategory, income);
        if (expense > 0) aggregate(financingExpense, subcategory, expense);
      }
    }
  });

  // 計算淨額
  const operatingIncomeTotal = operatingIncome.reduce((sum, i) => sum + i.amount, 0);
  const operatingExpenseTotal = operatingExpense.reduce((sum, i) => sum + i.amount, 0);
  const netOperating = operatingIncomeTotal - operatingExpenseTotal;

  const investingIncomeTotal = investingIncome.reduce((sum, i) => sum + i.amount, 0);
  const investingExpenseTotal = investingExpense.reduce((sum, i) => sum + i.amount, 0);
  const netInvesting = investingIncomeTotal - investingExpenseTotal;

  const financingIncomeTotal = financingIncome.reduce((sum, i) => sum + i.amount, 0);
  const financingExpenseTotal = financingExpense.reduce((sum, i) => sum + i.amount, 0);
  const netFinancing = financingIncomeTotal - financingExpenseTotal;

  const netChange = netOperating + netInvesting + netFinancing;

  // 合併所有項目用於向後相容
  const operatingItems = [
    ...operatingIncome,
    ...operatingExpense.map((e) => ({ ...e, amount: -e.amount })),
  ];
  const investingItems = [
    ...investingIncome,
    ...investingExpense.map((e) => ({ ...e, amount: -e.amount })),
  ];
  const financingItems = [
    ...financingIncome,
    ...financingExpense.map((e) => ({ ...e, amount: -e.amount })),
  ];

  return {
    operating: {
      income: operatingIncome,
      expense: operatingExpense,
      netAmount: netOperating,
      items: operatingItems,
    },
    investing: {
      income: investingIncome,
      expense: investingExpense,
      netAmount: netInvesting,
      items: investingItems,
    },
    financing: {
      income: financingIncome,
      expense: financingExpense,
      netAmount: netFinancing,
      items: financingItems,
    },
    netChange,
    beginningBalance: beginningCash,
    endingBalance: beginningCash + netChange,
  };
}
