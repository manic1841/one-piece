import type { BalanceSheetData } from './types';

/**
 * Single calculation path for equity (issue #127 Q1): assets.total minus
 * liabilities.total. Shared by the balance sheet aggregation and any
 * consumer that reads a stored balance sheet report (e.g. retirement
 * starting net worth).
 */
export function calculateEquityTotal(balanceSheet: BalanceSheetData): number {
  return balanceSheet.assets.total - balanceSheet.liabilities.total;
}
