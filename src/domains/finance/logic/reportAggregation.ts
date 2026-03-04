import {
  type BalanceSheetData,
  type CashFlowData,
  type CashFlowItem,
  type IncomeStatementData,
  type IncomeStatementItem,
} from '@/schemas';

/**
 * Aggregate multiple Income Statement reports into one (SUM)
 */
export function aggregateIncomeStatements(reports: IncomeStatementData[]): IncomeStatementData {
  const result: IncomeStatementData = {
    revenue: { total: 0, items: [] },
    expenses: { total: 0, items: [] },
    netIncome: 0,
  };

  if (reports.length === 0) return result;

  const mergeItems = (target: IncomeStatementItem[], source: IncomeStatementItem[]) => {
    source.forEach((s) => {
      const existing = target.find((t) => t.category === s.category);
      if (existing) {
        existing.amount += s.amount;
        if (s.subItems) {
          existing.subItems = existing.subItems || [];
          s.subItems.forEach((ss) => {
            const existingSub = existing.subItems?.find((ts) => ts.name === ss.name);
            if (existingSub) {
              existingSub.amount += ss.amount;
            } else {
              existing.subItems?.push({ ...ss });
            }
          });
        }
      } else {
        target.push(JSON.parse(JSON.stringify(s)));
      }
    });
  };

  reports.forEach((report) => {
    result.revenue.total += report.revenue.total;
    result.expenses.total += report.expenses.total;
    result.netIncome += report.netIncome;

    mergeItems(result.revenue.items, report.revenue.items);
    mergeItems(result.expenses.items, report.expenses.items);
  });

  return result;
}

/**
 * Aggregate multiple Cash Flow reports into one
 */
export function aggregateCashFlows(reports: CashFlowData[]): CashFlowData {
  const result: CashFlowData = {
    operating: { income: [], expense: [], netAmount: 0, items: [] },
    investing: { income: [], expense: [], netAmount: 0, items: [] },
    financing: { income: [], expense: [], netAmount: 0, items: [] },
    netChange: 0,
    beginningBalance: reports.length > 0 ? reports[0].beginningBalance : 0,
    endingBalance: reports.length > 0 ? reports[reports.length - 1].endingBalance : 0,
  };

  if (reports.length === 0) return result;

  const mergeItems = (target: CashFlowItem[], source: CashFlowItem[]) => {
    source.forEach((s) => {
      const existing = target.find((t) => t.category === s.category);
      if (existing) {
        existing.amount += s.amount;
        if (s.subItems) {
          existing.subItems = existing.subItems || [];
          s.subItems.forEach((ss) => {
            const existingSub = existing.subItems?.find((ts) => ts.name === ss.name);
            if (existingSub) {
              existingSub.amount += ss.amount;
            } else {
              existing.subItems?.push({ ...ss });
            }
          });
        }
      } else {
        target.push(JSON.parse(JSON.stringify(s)));
      }
    });
  };

  reports.forEach((report) => {
    result.netChange += report.netChange;

    (['operating', 'investing', 'financing'] as const).forEach((section) => {
      result[section].netAmount += report[section].netAmount;
      mergeItems(result[section].income, report[section].income);
      mergeItems(result[section].expense, report[section].expense);
    });
  });

  return result;
}

/**
 * Get the latest balance sheet data from a list of reports
 */
export function aggregateLatestBalanceSheet(reports: BalanceSheetData[]): BalanceSheetData {
  if (reports.length === 0) {
    return {
      assets: { total: 0, items: [] },
      liabilities: { total: 0, items: [] },
      equity: { total: 0, items: [] },
    };
  }
  // Logic assumes reports are sorted by date. We just take the last one as per requirement.
  return reports[reports.length - 1];
}
