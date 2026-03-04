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

      // 分別處理收入和支出
      if (category === CashFlowCategory.OPERATING) {
        // 如果該專案已經包含在損益表中，則跳過，避免在現金流量表中重複計算
        // (因為我們已經從 Net Income 開始了)
        if (project.accounting.incomeStatement) {
          return;
        }

        if (income > 0) {
          logger.debug(`Operating Income ${income} ${subcategory}`, 'cashFlowCalculator');
          aggregate(
            operatingIncome,
            subcategory || OperatingSubCategory.OTHER_OPERATING,
            income,
            order,
            { name: project.name, amount: income },
          );
        }
        if (expense > 0) {
          logger.debug(`Operating Expense ${expense} ${subcategory}`, 'cashFlowCalculator');
          aggregate(
            operatingExpense,
            subcategory || OperatingSubCategory.OTHER_OPERATING,
            expense,
            order,
            { name: project.name, amount: expense },
          );
        }
      } else if (category === CashFlowCategory.INVESTING) {
        if (income > 0) {
          logger.debug(`Investing Income ${income} ${subcategory}`, 'cashFlowCalculator');
          aggregate(
            investingIncome,
            subcategory || InvestingSubCategory.OTHER_INVESTING,
            income,
            order,
            { name: project.name, amount: income },
          );
        }
        if (expense > 0) {
          logger.debug(`Investing Expense ${expense} ${subcategory}`, 'cashFlowCalculator');
          aggregate(
            investingExpense,
            subcategory || InvestingSubCategory.OTHER_INVESTING,
            expense,
            order,
            { name: project.name, amount: expense },
          );
        }
      } else if (category === CashFlowCategory.FINANCING) {
        const isOwnerDraw = subcategory === FinancingSubCategory.OWNER_DRAWS;
        const inflow = isOwnerDraw ? expense : income;
        const outflow = isOwnerDraw ? income : expense;

        if (inflow > 0) {
          logger.debug(`Financing Income ${inflow} ${subcategory}`, 'cashFlowCalculator');
          aggregate(
            financingIncome,
            subcategory || FinancingSubCategory.OTHER_FINANCING,
            inflow,
            order,
            { name: project.name, amount: inflow },
          );
        }
        if (outflow > 0) {
          logger.debug(`Financing Expense ${outflow} ${subcategory}`, 'cashFlowCalculator');
          aggregate(
            financingExpense,
            subcategory || FinancingSubCategory.OTHER_FINANCING,
            outflow,
            order,
            { name: project.name, amount: outflow },
          );
        }
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
