import type { ProjectWithSnapshot } from '@/domains/project/types';
import { BalanceSheetItemSchema, CashFlowItemSchema } from '@/schemas';
import type { BalanceSheetData, CashFlowData } from '@/schemas';
import { z } from 'zod';

import type { AccountSnapshot } from '../../../schemas/account';

type BalanceSheetItem = z.infer<typeof BalanceSheetItemSchema>;
type CashFlowItem = z.infer<typeof CashFlowItemSchema>;

/**
 * Calculate Balance Sheet
 * Assets: AccountSnapshots + ProjectSnapshots (accounting.balanceSheet.category == 'asset')
 * Liabilities: ProjectSnapshots (accounting.balanceSheet.category == 'liability')
 * Equity: ProjectSnapshots (accounting.balanceSheet.category == 'equity') + Retained Earnings (calculated dynamically if needed, but here we rely on snapshots)
 */
export function calculateBalanceSheet(
  accountSnapshots: AccountSnapshot[],
  projectsWithSnapshots: ProjectWithSnapshot[],
): BalanceSheetData {
  // 1. Assets
  const assetItems: BalanceSheetItem[] = [];

  // Cash & Equivalents (Accounts)
  const cashAndEquivalents = accountSnapshots.reduce((sum, acc) => sum + acc.amount, 0);
  if (cashAndEquivalents > 0) {
    assetItems.push({
      category: 'Cash & Equivalents',
      amount: cashAndEquivalents,
      subItems: accountSnapshots.map((acc) => ({ name: acc.id, amount: acc.amount })), // Note: Account name might need to be fetched if not in snapshot, but snapshot has ID. Ideally snapshot should have name or we map it. AccountSnapshot doesn't have name, so we use ID for now or need to pass Accounts.
      // Optimization: Pass Accounts to map ID to Name. For now using ID.
    });
  }

  // Project Assets
  const assetMap = new Map<
    string,
    { amount: number; subItems: { name: string; amount: number }[] }
  >();

  projectsWithSnapshots.forEach((pws) => {
    const project = pws.project;
    const snapshot = pws.snapshot;
    if (!project || !snapshot) return;

    if (project?.accounting?.balanceSheet?.category === 'asset') {
      const subcategory = project.accounting.balanceSheet.subcategory || 'Other Assets';
      const amount = snapshot.closingBalance;

      if (amount !== 0) {
        const current = assetMap.get(subcategory) || { amount: 0, subItems: [] };
        current.amount += amount;
        current.subItems.push({ name: project.name, amount });
        assetMap.set(subcategory, current);
      }
    }
  });

  assetMap.forEach((data, category) => {
    assetItems.push({
      category,
      amount: data.amount,
      subItems: data.subItems,
    });
  });

  const totalAssets = assetItems.reduce((sum, item) => sum + item.amount, 0);

  // 2. Liabilities
  const liabilityItems: BalanceSheetItem[] = [];
  const liabilityMap = new Map<
    string,
    { amount: number; subItems: { name: string; amount: number }[] }
  >();

  projectsWithSnapshots.forEach((pws) => {
    const project = pws.project;
    const snapshot = pws.snapshot;
    if (!project || !snapshot) return;

    if (project?.accounting?.balanceSheet?.category === 'liability') {
      const subcategory = project.accounting.balanceSheet.subcategory || 'Other Liabilities';
      const amount = snapshot.closingBalance;

      if (amount !== 0) {
        const current = liabilityMap.get(subcategory) || { amount: 0, subItems: [] };
        current.amount += amount;
        current.subItems.push({ name: project.name, amount });
        liabilityMap.set(subcategory, current);
      }
    }
  });

  liabilityMap.forEach((data, category) => {
    liabilityItems.push({
      category,
      amount: data.amount,
      subItems: data.subItems,
    });
  });

  const totalLiabilities = liabilityItems.reduce((sum, item) => sum + item.amount, 0);

  // 3. Equity
  const equityItems: BalanceSheetItem[] = [];
  const equityMap = new Map<
    string,
    { amount: number; subItems: { name: string; amount: number }[] }
  >();

  projectsWithSnapshots.forEach((pws) => {
    const project = pws.project;
    const snapshot = pws.snapshot;
    if (!project || !snapshot) return;

    if (project?.accounting?.balanceSheet?.category === 'equity') {
      const subcategory = project.accounting.balanceSheet.subcategory || 'Other Equity';
      const amount = snapshot.closingBalance;

      if (amount !== 0) {
        const current = equityMap.get(subcategory) || { amount: 0, subItems: [] };
        current.amount += amount;
        current.subItems.push({ name: project.name, amount });
        equityMap.set(subcategory, current);
      }
    }
  });

  equityMap.forEach((data, category) => {
    equityItems.push({
      category,
      amount: data.amount,
      subItems: data.subItems,
    });
  });

  const totalEquity = equityItems.reduce((sum, item) => sum + item.amount, 0);

  return {
    assets: { total: totalAssets, items: assetItems },
    liabilities: { total: totalLiabilities, items: liabilityItems },
    equity: { total: totalEquity, items: equityItems },
  };
}

/**
 * Calculate Cash Flow Statement
 * Operating, Investing, Financing based on project.accounting.cashFlow
 */
export function calculateCashFlowStatement(
  projectsWithSnapshots: ProjectWithSnapshot[],
  beginningCash: number,
): CashFlowData {
  const operatingItems: CashFlowItem[] = [];
  const investingItems: CashFlowItem[] = [];
  const financingItems: CashFlowItem[] = [];

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
    const project = pws.project;
    const snapshot = pws.snapshot;
    if (!project || !snapshot) return;

    if (project?.accounting?.cashFlow) {
      const { activity, subcategory } = project.accounting.cashFlow;
      // For Cash Flow, we look at the NET CHANGE in the project for the period.
      // However, ProjectSnapshot stores opening/income/expense/closing.
      // Net Change = Income - Expense.
      // Sign convention: Inflow is positive, Outflow is negative.
      // Usually project income is inflow, expense is outflow.
      const netChange = snapshot.income - snapshot.expense;

      if (netChange !== 0) {
        if (activity === 'operating') {
          aggregate(operatingItems, subcategory, netChange);
        } else if (activity === 'investing') {
          aggregate(investingItems, subcategory, netChange);
        } else if (activity === 'financing') {
          aggregate(financingItems, subcategory, netChange);
        }
      }
    }
  });

  const netOperating = operatingItems.reduce((sum, i) => sum + i.amount, 0);
  const netInvesting = investingItems.reduce((sum, i) => sum + i.amount, 0);
  const netFinancing = financingItems.reduce((sum, i) => sum + i.amount, 0);
  const netChange = netOperating + netInvesting + netFinancing;

  return {
    operating: { netAmount: netOperating, items: operatingItems },
    investing: { netAmount: netInvesting, items: investingItems },
    financing: { netAmount: netFinancing, items: financingItems },
    netChange,
    beginningBalance: beginningCash,
    endingBalance: beginningCash + netChange,
  };
}

/**
 * Reconcile Reports
 * Compare Balance Sheet Cash vs Cash Flow Ending Cash
 */
export function reconcileReports(
  balanceSheet: BalanceSheetData,
  cashFlow: CashFlowData,
): { reconciled: boolean; difference: number } {
  // Find Cash & Equivalents in Balance Sheet
  // Assuming 'Cash & Equivalents' is the category name used in calculateBalanceSheet
  const cashAsset = balanceSheet.assets.items.find((i) => i.category === 'Cash & Equivalents');
  const balanceSheetCash = cashAsset ? cashAsset.amount : 0;

  const cashFlowEnding = cashFlow.endingBalance;

  const difference = balanceSheetCash - cashFlowEnding;
  const reconciled = Math.abs(difference) < 0.01; // Tolerance for floating point errors

  return { reconciled, difference };
}
