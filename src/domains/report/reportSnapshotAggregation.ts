import {
  type CashFlowData,
  type CashFlowGroup,
  type CashFlowItem,
  type IncomeStatementData,
  type IncomeStatementItem,
} from './schemas';

type AmountEntry = {
  label: string;
  amount: number;
};

function mergeAmountEntries(
  target: Map<string, AmountEntry>,
  items: Array<{ code: string; label: string; amount: number }>,
): void {
  for (const item of items) {
    const current = target.get(item.code);
    target.set(item.code, {
      label: current?.label || item.label,
      amount: (current?.amount || 0) + item.amount,
    });
  }
}

function mapToIncomeStatementItems(map: Map<string, AmountEntry>): IncomeStatementItem[] {
  return Array.from(map.entries())
    .map(([code, value]) => ({
      code,
      label: value.label,
      amount: Math.abs(value.amount),
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function mapToCashFlowItems(map: Map<string, AmountEntry>): CashFlowItem[] {
  return Array.from(map.entries())
    .map(([code, value]) => ({
      code,
      label: value.label,
      amount: value.amount,
    }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function aggregateCashFlowGroup(
  label: string,
  reports: CashFlowData[],
  selector: (report: CashFlowData) => CashFlowGroup,
): CashFlowGroup {
  const inflowMap = new Map<string, AmountEntry>();
  const outflowMap = new Map<string, AmountEntry>();
  let total = 0;

  for (const report of reports) {
    const group = selector(report);
    total += group.total;
    mergeAmountEntries(inflowMap, group.inflowItems);
    mergeAmountEntries(outflowMap, group.outflowItems);
  }

  return {
    label,
    total,
    inflowItems: mapToCashFlowItems(inflowMap),
    outflowItems: mapToCashFlowItems(outflowMap),
  };
}

export function buildYearMonthKeys(year: string): string[] {
  return Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);
}

export function aggregateIncomeStatementSnapshots(
  yearMonth: string,
  reports: IncomeStatementData[],
): IncomeStatementData {
  let incomeTotal = 0;
  let expenseTotal = 0;
  const incomeMap = new Map<string, AmountEntry>();
  const expenseMap = new Map<string, AmountEntry>();

  for (const report of reports) {
    incomeTotal += report.incomeTotal;
    expenseTotal += report.expenseTotal;
    mergeAmountEntries(incomeMap, report.incomeItems);
    mergeAmountEntries(expenseMap, report.expenseItems);
  }

  return {
    yearMonth,
    incomeTotal,
    expenseTotal,
    netIncome: incomeTotal - expenseTotal,
    incomeItems: mapToIncomeStatementItems(incomeMap),
    expenseItems: mapToIncomeStatementItems(expenseMap),
  };
}

export function aggregateCashFlowSnapshots(
  yearMonth: string,
  reports: CashFlowData[],
): CashFlowData {
  const operating = aggregateCashFlowGroup('營業活動', reports, (report) => report.operating);
  const investing = aggregateCashFlowGroup('投資活動', reports, (report) => report.investing);
  const financing = aggregateCashFlowGroup('融資活動', reports, (report) => report.financing);
  const netCashChange = operating.total + investing.total + financing.total;
  const beginningBalance = reports[0]?.beginningBalance || 0;
  const lastReport = reports[reports.length - 1];
  const endingBalance = lastReport?.endingBalance || beginningBalance + netCashChange;
  const actualBalance = lastReport?.actualBalance || endingBalance;

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
