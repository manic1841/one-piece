import { AssetSubCategory } from '@/domains/finance/types/categories';
import type { BalanceSheetData, CashFlowData } from '@/schemas';

/**
 * Reconcile Reports
 * Compare Balance Sheet Cash vs Cash Flow Ending Cash
 */
export function reconcileReports(
  balanceSheet: BalanceSheetData,
  cashFlow: CashFlowData,
): { reconciled: boolean; difference: number } {
  // Find Cash & Equivalents in Balance Sheet
  const cashAsset = balanceSheet.assets.items.find((i) => i.category === AssetSubCategory.CASH);
  const balanceSheetCash = cashAsset ? cashAsset.amount : 0;

  const cashFlowEnding = cashFlow.endingBalance;

  const cashDifference = balanceSheetCash - cashFlowEnding;
  const cashReconciled = Math.abs(cashDifference) < 0.01; // Tolerance for floating point errors

  // Check Balance Sheet equation: Assets = Liabilities + Equity
  const totalAssets = balanceSheet.assets.total;
  const totalLiabilities = balanceSheet.liabilities.total;
  const totalEquity = balanceSheet.equity.total;
  const balanceSheetDifference = totalAssets - (totalLiabilities + totalEquity);
  const balanceSheetReconciled = Math.abs(balanceSheetDifference) < 0.01;

  // Both conditions must be met for full reconciliation
  const reconciled = cashReconciled && balanceSheetReconciled;
  const difference = cashReconciled ? balanceSheetDifference : cashDifference;

  return { reconciled, difference };
}
