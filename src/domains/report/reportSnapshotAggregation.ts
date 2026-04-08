import {
  type BalanceSheetData,
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

export function aggregateBalanceSheetSnapshots(
  yearMonth: string,
  reports: BalanceSheetData[], // ordered Jan–Dec, missing months omitted
): BalanceSheetData {
  const january = reports[0];
  const december = reports[reports.length - 1];

  // Assets and liabilities: year-end position (December)
  const assets = december.assets;
  const liabilities = december.liabilities;

  // Equity: opening balance from January, flow items summed across all 12 months
  const openingEquityGroup = january.equity.groups['openingEquity'];
  const openingEquity = openingEquityGroup?.total ?? 0;

  let netIncomeTotal = 0;
  let capitalTotal = 0;
  let stockGainTotal = 0;
  const capitalItemsMap = new Map<string, AmountEntry>();

  for (const report of reports) {
    netIncomeTotal += report.equity.groups['netIncome']?.total ?? 0;
    capitalTotal += report.equity.groups['capital']?.total ?? 0;
    stockGainTotal += report.equity.groups['stock_gain']?.total ?? 0;
    mergeAmountEntries(capitalItemsMap, report.equity.groups['capital']?.items ?? []);
  }

  const equityTotal = assets.total - liabilities.total;
  const adjustmentTotal =
    equityTotal - (openingEquity + netIncomeTotal + capitalTotal + stockGainTotal);

  return {
    yearMonth,
    assets,
    liabilities,
    equity: {
      total: equityTotal,
      groups: {
        openingEquity: {
          label: openingEquityGroup?.label ?? '期初餘額',
          total: openingEquity,
          items: [],
        },
        netIncome: { label: '本期淨利', total: netIncomeTotal, items: [] },
        capital: {
          label: '資本',
          total: capitalTotal,
          items: Array.from(capitalItemsMap.entries()).map(([code, v]) => ({
            code,
            label: v.label,
            amount: v.amount,
          })),
        },
        stock_gain: { label: '股票損益', total: stockGainTotal, items: [] },
        adjustment: { label: '調整', total: adjustmentTotal, items: [] },
      },
    },
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
