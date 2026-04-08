import { format, subMonths } from 'date-fns';
import { limit } from 'firebase/firestore';

import { accountRepository } from '@/infra/repositories/accountRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';

import { categorizeLedgerEntry } from './cashFlowUtils';
import { type CashFlowData, type CashFlowItem, ReportType } from './schemas';

type ReportLabelResolver = (code: string, fallbackLabel?: string) => string;

async function getLiquidBalance(householdId: string, yearMonth: string): Promise<number> {
  const accounts = await accountRepository.getAccounts(householdId);
  let total = 0;

  for (const account of accounts) {
    if (account.category === 'bank' || account.category === 'cash') {
      const snapshot = await accountRepository.getSnapshot(householdId, account.id, yearMonth);
      total += snapshot?.amount || 0;
    }
  }

  return total;
}

export async function generateCashFlowSnapshot(
  householdId: string,
  yearMonth: string,
  resolveLabel: ReportLabelResolver,
): Promise<CashFlowData> {
  const [yearNum, monthNum] = yearMonth.split('-').map(Number);
  const prevMonthDate = subMonths(new Date(yearNum, monthNum - 1, 1), 1);
  const prevYearMonth = format(prevMonthDate, 'yyyy-MM');

  const prevReport = await reportRepository.getReport(
    householdId,
    prevYearMonth,
    ReportType.CASH_FLOW,
  );

  let beginningBalance = 0;
  if (prevReport?.data) {
    beginningBalance = (prevReport.data as CashFlowData).actualBalance;
  } else {
    const existingReports = await reportRepository.list([householdId], [limit(1)]);
    beginningBalance =
      existingReports.length === 0 ? 0 : await getLiquidBalance(householdId, prevYearMonth);
  }

  const groups = {
    operating: { inflow: new Map<string, number>(), outflow: new Map<string, number>() },
    investing: { inflow: new Map<string, number>(), outflow: new Map<string, number>() },
    financing: { inflow: new Map<string, number>(), outflow: new Map<string, number>() },
  };

  const entries = await reportRepository.getEntriesByMonth(householdId, yearMonth);
  for (const entry of entries) {
    categorizeLedgerEntry(entry, groups);
  }

  const buildGroup = (
    label: string,
    data: { inflow: Map<string, number>; outflow: Map<string, number> },
  ) => {
    const inflowItems: CashFlowItem[] = Array.from(data.inflow.entries())
      .map(([code, amount]) => ({
        code,
        label: resolveLabel(code, code),
        amount,
      }))
      .filter((item) => item.amount > 0);

    const outflowItems: CashFlowItem[] = Array.from(data.outflow.entries())
      .map(([code, amount]) => ({
        code,
        label: resolveLabel(code, code),
        amount,
      }))
      .filter((item) => item.amount > 0);

    const total =
      inflowItems.reduce((sum, item) => sum + item.amount, 0) -
      outflowItems.reduce((sum, item) => sum + item.amount, 0);

    return { label, total, inflowItems, outflowItems };
  };

  const operating = buildGroup('營業活動', groups.operating);
  const investing = buildGroup('投資活動', groups.investing);
  const financing = buildGroup('融資活動', groups.financing);
  const netCashChange = operating.total + investing.total + financing.total;
  const endingBalance = beginningBalance + netCashChange;
  const actualBalance = await getLiquidBalance(householdId, yearMonth);

  return {
    yearMonth,
    operating,
    investing,
    financing,
    netCashChange,
    beginningBalance,
    endingBalance,
    actualBalance,
    adjustment: actualBalance - endingBalance,
  };
}
