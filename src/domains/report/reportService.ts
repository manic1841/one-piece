import { format, subMonths } from 'date-fns';

import { LEDGER_CODES, LEDGER_PREFIX } from '@/domains/ledger/constants';
import { accountRepository } from '@/infra/repositories/accountRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';

import { generateCashFlowSnapshot } from './reportMonthlyGenerators';
import {
  aggregateBalanceSheetSnapshots,
  aggregateCashFlowSnapshots,
  aggregateIncomeStatementSnapshots,
  buildYearMonthKeys,
} from './reportSnapshotAggregation';
import {
  type BalanceSheetData,
  type BalanceSheetItem,
  type CashFlowData,
  type IncomeStatementData,
  type IncomeStatementItem,
  ReportType,
} from './schemas';

export type ReportLabelResolver = (code: string, fallbackLabel?: string) => string;

export class ReportService {
  private resolveLabel(
    code: string,
    labelResolver?: ReportLabelResolver,
    fallbackLabel?: string,
  ): string {
    if (!labelResolver) return fallbackLabel ?? code;
    const resolved = labelResolver(code, fallbackLabel);
    return resolved || fallbackLabel || code;
  }

  async generateIncomeStatement(
    householdId: string,
    yearMonth: string,
    labelResolver?: ReportLabelResolver,
  ): Promise<IncomeStatementData> {
    // Only support monthly snapshots (yyyy-MM format)
    const entries = await reportRepository.getEntriesByMonth(householdId, yearMonth);

    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();

    for (const entry of entries) {
      const fullCode = entry.ledgerCode;
      const parts = fullCode.split(':');
      if (parts.length < 2) continue;

      const type = parts[0];

      if (type === LEDGER_PREFIX.INCOME) {
        // Revenue: Sum of credits
        const amount = incomeMap.get(fullCode) || 0;
        incomeMap.set(fullCode, amount + entry.credit);
      } else if (type === LEDGER_PREFIX.EXPENSE) {
        // Expenses: Sum of debits
        const amount = expenseMap.get(fullCode) || 0;
        expenseMap.set(fullCode, amount + entry.debit);
      }
    }

    const mapToItems = (map: Map<string, number>): IncomeStatementItem[] => {
      return Array.from(map.entries())
        .map(([code, amount]) => ({
          code,
          label: this.resolveLabel(code, labelResolver, code),
          amount: Math.abs(amount),
        }))
        .filter((item) => item.amount > 0)
        .sort((a, b) => b.amount - a.amount);
    };

    const incomeItems = mapToItems(incomeMap);
    const expenseItems = mapToItems(expenseMap);

    const incomeTotal = incomeItems.reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = expenseItems.reduce((sum, item) => sum + item.amount, 0);

    return {
      yearMonth,
      incomeTotal,
      expenseTotal,
      netIncome: incomeTotal - expenseTotal,
      incomeItems,
      expenseItems,
    };
  }

  async getStoredIncomeStatement(
    householdId: string,
    yearMonth: string,
  ): Promise<IncomeStatementData | null> {
    if (yearMonth.length !== 4) {
      const report = await reportRepository.getReport(
        householdId,
        yearMonth,
        ReportType.INCOME_STATEMENT,
      );
      return report ? (report.data as IncomeStatementData) : null;
    }

    const reports = await Promise.all(
      buildYearMonthKeys(yearMonth).map(async (monthKey: string) => {
        const report = await reportRepository.getReport(
          householdId,
          monthKey,
          ReportType.INCOME_STATEMENT,
        );
        return report ? (report.data as IncomeStatementData) : null;
      }),
    );
    const monthlyReports = reports.filter(
      (report: IncomeStatementData | null): report is IncomeStatementData => report !== null,
    );

    if (monthlyReports.length === 0) {
      return null;
    }

    return aggregateIncomeStatementSnapshots(yearMonth, monthlyReports);
  }

  async getStoredBalanceSheet(
    householdId: string,
    yearMonth: string,
  ): Promise<BalanceSheetData | null> {
    const isYearMode = yearMonth.length === 4;

    if (isYearMode) {
      // Fetch all 12 monthly snapshots
      const monthlyReports = (
        await Promise.all(
          buildYearMonthKeys(yearMonth).map(async (monthKey) => {
            const report = await reportRepository.getReport(
              householdId,
              monthKey,
              ReportType.BALANCE_SHEET,
            );
            return report ? (report.data as BalanceSheetData) : null;
          }),
        )
      ).filter((r): r is BalanceSheetData => r !== null);

      // Require at least December to have a meaningful year-end position
      const decemberKey = yearMonth + '-12';
      const hasDecember = monthlyReports.some((r) => r.yearMonth === decemberKey);
      if (!hasDecember || monthlyReports.length === 0) return null;

      return aggregateBalanceSheetSnapshots(yearMonth, monthlyReports);
    } else {
      // Monthly mode: fetch single snapshot
      const report = await reportRepository.getReport(
        householdId,
        yearMonth,
        ReportType.BALANCE_SHEET,
      );
      return report ? (report.data as BalanceSheetData) : null;
    }
  }

  async getStoredCashFlow(householdId: string, yearMonth: string): Promise<CashFlowData | null> {
    if (yearMonth.length !== 4) {
      const report = await reportRepository.getReport(householdId, yearMonth, ReportType.CASH_FLOW);
      return report ? (report.data as CashFlowData) : null;
    }

    const reports = await Promise.all(
      buildYearMonthKeys(yearMonth).map(async (monthKey: string) => {
        const report = await reportRepository.getReport(
          householdId,
          monthKey,
          ReportType.CASH_FLOW,
        );
        return report ? (report.data as CashFlowData) : null;
      }),
    );
    const monthlyReports = reports.filter(
      (report: CashFlowData | null): report is CashFlowData => report !== null,
    );

    if (monthlyReports.length === 0) {
      return null;
    }

    return aggregateCashFlowSnapshots(yearMonth, monthlyReports);
  }

  async saveReport(
    householdId: string,
    data: IncomeStatementData | BalanceSheetData | CashFlowData,
    userEmail: string,
  ): Promise<void> {
    let type: ReportType;
    if ('incomeTotal' in data) {
      type = ReportType.INCOME_STATEMENT;
    } else if ('assets' in data) {
      type = ReportType.BALANCE_SHEET;
    } else {
      type = ReportType.CASH_FLOW;
    }

    await reportRepository.saveReport(
      householdId,
      {
        householdId,
        type,
        yearMonth: data.yearMonth,
        data: data,
        createdBy: userEmail,
        updatedBy: userEmail,
      },
      userEmail,
    );
  }

  async generateMonthlyFinancialReports(
    householdId: string,
    yearMonth: string,
    userEmail: string,
    labelResolver?: ReportLabelResolver,
  ): Promise<{
    incomeStatement: IncomeStatementData;
    balanceSheet: BalanceSheetData;
    cashFlow: CashFlowData;
    timestamp: Date;
  }> {
    const [incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      this.generateIncomeStatement(householdId, yearMonth, labelResolver),
      this.generateBalanceSheet(householdId, yearMonth, labelResolver),
      this.generateCashFlow(householdId, yearMonth, labelResolver),
    ]);

    await Promise.all([
      this.saveReport(householdId, incomeStatement, userEmail),
      this.saveReport(householdId, balanceSheet, userEmail),
      this.saveReport(householdId, cashFlow, userEmail),
    ]);

    return {
      incomeStatement,
      balanceSheet,
      cashFlow,
      timestamp: new Date(),
    };
  }

  async generateBalanceSheet(
    householdId: string,
    yearMonth: string,
    labelResolver?: ReportLabelResolver,
  ): Promise<BalanceSheetData> {
    // Only support monthly snapshots (yyyy-MM format)
    const entries = await reportRepository.getEntriesUntilMonth(householdId, yearMonth);
    const accounts = await accountRepository.getAccounts(householdId);
    const portfolios = await portfolioRepository.list([householdId]);
    const debtAccounts = await debtAccountRepository.getDebtAccounts(householdId);

    let cashAndBankTotal = 0;
    const accountItems: BalanceSheetItem[] = [];

    for (const account of accounts) {
      if (account.category === 'bank' || account.category === 'cash') {
        const snapshot = await accountRepository.getSnapshot(householdId, account.id, yearMonth);
        const amount = snapshot?.amount || 0;
        cashAndBankTotal += amount;
        accountItems.push({
          code: `account:${account.id}`,
          label: account.name,
          amount,
        });
      }
    }

    let investmentTotalValue = 0;
    const investmentItems: BalanceSheetItem[] = [];
    for (const account of accounts) {
      if (account.category === 'securities') {
        const snapshot = await accountRepository.getSnapshot(householdId, account.id, yearMonth);
        const amount = snapshot?.amount || 0;
        investmentTotalValue += amount;
        investmentItems.push({
          code: `account:${account.id}`,
          label: account.name,
          amount,
        });
      }
    }

    const ledgerTotals = new Map<string, number>();
    for (const entry of entries) {
      const current = ledgerTotals.get(entry.ledgerCode) || 0;
      ledgerTotals.set(entry.ledgerCode, current + (entry.debit - entry.credit));
    }

    const getCumulativeTotal = (prefix: string) => {
      let total = 0;
      const items: BalanceSheetItem[] = [];
      for (const [code, amount] of ledgerTotals.entries()) {
        if (code.startsWith(prefix)) {
          total += amount;
          items.push({
            code,
            label: this.resolveLabel(code, labelResolver, code),
            amount,
          });
        }
      }
      return { total, items };
    };

    const property = getCumulativeTotal(LEDGER_CODES.ASSET_PROPERTY);

    let debtTotal = 0;
    const debtItems: BalanceSheetItem[] = [];
    for (const debt of debtAccounts) {
      const snapshot = await debtSnapshotRepository.getSnapshot(householdId, debt.id, yearMonth);
      const amount = snapshot?.closingBalance || 0;
      debtTotal += amount;
      debtItems.push({
        code: `debt:${debt.id}`,
        label: debt.name,
        amount,
      });
    }

    const assetsTotal = cashAndBankTotal + investmentTotalValue + property.total;
    const liabilitiesTotal = debtTotal;

    const totalEquity = assetsTotal - liabilitiesTotal;

    const [yearNum, monthNum] = yearMonth.split('-').map(Number);
    const prevMonthDate = subMonths(new Date(yearNum, monthNum - 1, 1), 1);
    const prevYearMonth = format(prevMonthDate, 'yyyy-MM');

    const prevReport = await reportRepository.getReport(
      householdId,
      prevYearMonth,
      ReportType.BALANCE_SHEET,
    );
    let openingEquity = 0;
    if (prevReport && prevReport.data && (prevReport.data as BalanceSheetData).equity) {
      openingEquity = (prevReport.data as BalanceSheetData).equity.total;
    } else {
      openingEquity = 0;
    }

    const incomeStatement = await this.generateIncomeStatement(
      householdId,
      yearMonth,
      labelResolver,
    );
    const netIncome = incomeStatement.netIncome;

    const monthlyEntries = await reportRepository.getEntriesByMonth(householdId, yearMonth);
    const monthlyLedgerTotals = new Map<string, number>();
    for (const entry of monthlyEntries) {
      const current = monthlyLedgerTotals.get(entry.ledgerCode) || 0;
      monthlyLedgerTotals.set(entry.ledgerCode, current + (entry.debit - entry.credit));
    }

    const getCapitalTotal = (prefix: string) => {
      let total = 0;
      const items: BalanceSheetItem[] = [];
      for (const [code, amount] of monthlyLedgerTotals.entries()) {
        if (code.startsWith(prefix)) {
          const val = -amount;
          total += val;
          items.push({
            code,
            label: this.resolveLabel(code, labelResolver, code),
            amount: val,
          });
        }
      }
      return { total, items };
    };
    const capital = getCapitalTotal(LEDGER_CODES.EQUITY_CAPITAL);

    let stockGain = 0;
    const stockGainItems: BalanceSheetItem[] = [];
    for (const portfolio of portfolios) {
      const snapshot = await portfolioSnapshotRepository.get([
        householdId,
        portfolio.id,
        yearMonth,
      ]);
      const amount = snapshot?.performance?.gain || 0;
      stockGain += amount;
      stockGainItems.push({
        code: `portfolio:${portfolio.id}`,
        label: portfolio.name,
        amount,
      });
    }

    const adjustment = totalEquity - (openingEquity + netIncome + capital.total + stockGain);

    return {
      yearMonth,
      assets: {
        total: assetsTotal,
        groups: {
          cash: { label: '現金與銀行', total: cashAndBankTotal, items: accountItems },
          investment: { label: '投資資產', total: investmentTotalValue, items: investmentItems },
          property: { label: '不動產', total: property.total, items: property.items },
        },
      },
      liabilities: {
        total: liabilitiesTotal,
        groups: {
          loan: { label: '貸款', total: debtTotal, items: debtItems },
        },
      },
      equity: {
        total: totalEquity,
        groups: {
          openingEquity: { label: '期初餘額', total: openingEquity, items: [] },
          netIncome: { label: '本期淨利', total: netIncome, items: [] },
          capital: { label: '資本', total: capital.total, items: capital.items },
          stock_gain: { label: '股票損益', total: stockGain, items: [] },
          adjustment: { label: '調整', total: adjustment, items: [] },
        },
      },
    };
  }

  async generateCashFlow(
    householdId: string,
    yearMonth: string,
    labelResolver?: ReportLabelResolver,
  ): Promise<CashFlowData> {
    return generateCashFlowSnapshot(
      householdId,
      yearMonth,
      (code: string, fallbackLabel?: string) =>
        this.resolveLabel(code, labelResolver, fallbackLabel),
    );
  }
}

export const reportService = new ReportService();
