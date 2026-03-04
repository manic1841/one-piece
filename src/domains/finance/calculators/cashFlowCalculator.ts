import { z } from 'zod';

import {
  CashFlowCategory,
  type CashFlowData,
  CashFlowItemSchema,
  FinancingSubCategory,
  InvestingSubCategory,
  OperatingSubCategory,
} from '@/domains/finance/types';
import type { ProjectWithSnapshot } from '@/domains/project/types';
import { ProjectExpenseBehavior, ProjectIncomeBehavior } from '@/domains/project/types/categories';
import { logger } from '@/utils/logger';

type CashFlowItem = z.infer<typeof CashFlowItemSchema>;

/**
 * Calculate Cash Flow Statement
 * Operating, Investing, Financing based on project.accounting.cashFlow
 */
export function calculateCashFlowStatement(
  projectsWithSnapshots: ProjectWithSnapshot[],
  beginningCash: number,
  netIncome: number = 0,
): CashFlowData {
  const operatingIncome: CashFlowItem[] = [];
  const operatingExpense: CashFlowItem[] = [];
  const investingIncome: CashFlowItem[] = [];
  const investingExpense: CashFlowItem[] = [];
  const financingIncome: CashFlowItem[] = [];
  const financingExpense: CashFlowItem[] = [];

  // Helper to aggregate
  const aggregate = (
    items: CashFlowItem[],
    category: string,
    amount: number,
    _?: number,
    subItem?: { name: string; amount: number },
  ) => {
    const existing = items.find((i) => i.category === category);
    if (existing) {
      existing.amount += amount;
      if (subItem) {
        if (!existing.subItems) existing.subItems = [];
        existing.subItems.push(subItem);
      }
    } else {
      items.push({
        category,
        amount,
        subItems: subItem ? [subItem] : [],
      });
    }
  };

  // 1. Starting point: Net Income as Operating Inflow (Regular Operations)
  if (netIncome !== 0) {
    aggregate(operatingIncome, OperatingSubCategory.REGULAR_OPERATIONS, netIncome, 0, {
      name: '本期淨利',
      amount: netIncome,
    });
  }

  // 2. Process Projects
  projectsWithSnapshots.forEach((pws) => {
    const project = pws;
    const snapshot = pws.snapshot;
    if (!project || !snapshot) return;

    if (project?.accounting?.cashFlow) {
      const { category, subcategory, order } = project.accounting.cashFlow;
      const income = snapshot.income;
      const expense = snapshot.expense;
      const behavior = project.accounting.flowBehavior;

      // Calculate Net Inflow and Outflow based on flowBehavior
      let netProjectInflow = 0;
      let netProjectOutflow = 0;

      if (!behavior) {
        // Legacy behavior
        netProjectInflow = income;
        netProjectOutflow = expense;
      } else {
        // Handle Income mapping
        if (
          (
            [
              ProjectIncomeBehavior.INCREASE_INCOME,
              ProjectExpenseBehavior.DECREASE_ASSET,
              ProjectExpenseBehavior.INCREASE_LIABILITY,
              ProjectExpenseBehavior.OWNER_DEPOSIT,
            ] as string[]
          ).includes(behavior.incomeAs)
        ) {
          netProjectInflow += income;
        } else if (
          (
            [
              ProjectIncomeBehavior.DECREASE_INCOME,
              ProjectIncomeBehavior.INCREASE_ASSET,
              ProjectIncomeBehavior.DECREASE_LIABILITY,
              ProjectIncomeBehavior.OWNER_DRAW,
            ] as string[]
          ).includes(behavior.incomeAs)
        ) {
          netProjectOutflow += income;
        }

        // Handle Expense mapping
        if (
          (
            [
              ProjectExpenseBehavior.INCREASE_EXPENSE,
              ProjectIncomeBehavior.INCREASE_ASSET,
              ProjectIncomeBehavior.DECREASE_LIABILITY,
              ProjectIncomeBehavior.OWNER_DRAW,
            ] as string[]
          ).includes(behavior.expenseAs)
        ) {
          netProjectOutflow += expense;
        } else if (
          (
            [
              ProjectExpenseBehavior.DECREASE_EXPENSE,
              ProjectExpenseBehavior.DECREASE_ASSET,
              ProjectExpenseBehavior.INCREASE_LIABILITY,
              ProjectExpenseBehavior.OWNER_DEPOSIT,
            ] as string[]
          ).includes(behavior.expenseAs)
        ) {
          netProjectInflow += expense;
        }
      }

      // Determine target bucket
      let targetIncomes: CashFlowItem[];
      let targetExpenses: CashFlowItem[];
      let defaultSubcategory: string;

      if (category === CashFlowCategory.INVESTING) {
        targetIncomes = investingIncome;
        targetExpenses = investingExpense;
        defaultSubcategory = InvestingSubCategory.OTHER_INVESTING;
      } else if (category === CashFlowCategory.FINANCING) {
        targetIncomes = financingIncome;
        targetExpenses = financingExpense;
        defaultSubcategory = FinancingSubCategory.OTHER_FINANCING;
      } else {
        // OPERATING
        if (project.accounting.incomeStatement) return; // Skip if already in IS
        targetIncomes = operatingIncome;
        targetExpenses = operatingExpense;
        defaultSubcategory = OperatingSubCategory.OTHER_OPERATING;
      }

      if (netProjectInflow > 0) {
        logger.debug(`${category} Inflow ${netProjectInflow} ${subcategory}`, 'cashFlowCalculator');
        aggregate(targetIncomes, subcategory || defaultSubcategory, netProjectInflow, order, {
          name: project.name,
          amount: netProjectInflow,
        });
      }
      if (netProjectOutflow > 0) {
        logger.debug(
          `${category} Outflow ${netProjectOutflow} ${subcategory}`,
          'cashFlowCalculator',
        );
        aggregate(targetExpenses, subcategory || defaultSubcategory, netProjectOutflow, order, {
          name: project.name,
          amount: netProjectOutflow,
        });
      }
    }
  });

  // 計算淨額
  const operatingIncomeTotal = operatingIncome.reduce((sum, i) => sum + i.amount, 0);
  const operatingExpenseTotal = operatingExpense.reduce((sum, i) => sum + i.amount, 0);
  const netOperating = operatingIncomeTotal - operatingExpenseTotal;
  logger.debug(
    `operating: income ${operatingIncomeTotal}, expense ${operatingExpenseTotal}, net ${netOperating}`,
    'cashFlowCalculator',
  );

  const investingIncomeTotal = investingIncome.reduce((sum, i) => sum + i.amount, 0);
  const investingExpenseTotal = investingExpense.reduce((sum, i) => sum + i.amount, 0);
  const netInvesting = investingIncomeTotal - investingExpenseTotal;
  logger.debug(
    `investing: income ${investingIncomeTotal}, expense ${investingExpenseTotal}, net ${netInvesting}`,
    'cashFlowCalculator',
  );

  const financingIncomeTotal = financingIncome.reduce((sum, i) => sum + i.amount, 0);
  const financingExpenseTotal = financingExpense.reduce((sum, i) => sum + i.amount, 0);
  const netFinancing = financingIncomeTotal - financingExpenseTotal;
  logger.debug(
    `financing: income ${financingIncomeTotal}, expense ${financingExpenseTotal}, net ${netFinancing}`,
    'cashFlowCalculator',
  );

  const netChange = netOperating + netInvesting + netFinancing;
  logger.debug(`netChange: ${netChange}`, 'cashFlowCalculator');

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
