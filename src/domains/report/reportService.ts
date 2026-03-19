import { format, subMonths } from 'date-fns';

import { LEDGER_CODES, LEDGER_PREFIX } from '@/domains/ledger/constants';
import { accountRepository } from '@/infra/repositories/accountRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { getLedgerLabel } from '@/ui/constants/report/ledgerCodeLabels';

import {
  type BalanceSheetData,
  type BalanceSheetItem,
  type CashFlowData,
  type CashFlowItem,
  type IncomeStatementData,
  type IncomeStatementItem,
  ReportType,
} from './schemas';

export class ReportService {
  async generateIncomeStatement(
    householdId: string,
    yearMonth: string,
  ): Promise<IncomeStatementData> {
    const entries = await reportRepository.getEntriesByMonth(householdId, yearMonth);

    const incomeMap = new Map<string, number>();
    const expenseMap = new Map<string, number>();

    for (const entry of entries) {
      const fullCode = entry.ledgerCode;
      const parts = fullCode.split(':');
      if (parts.length < 2) continue;

      const type = parts[0];
      const categoryCode = `${type}:${parts[1]}`;

      if (type === LEDGER_PREFIX.INCOME) {
        // Revenue: Sum of credits
        const amount = incomeMap.get(categoryCode) || 0;
        incomeMap.set(categoryCode, amount + entry.credit);
      } else if (type === LEDGER_PREFIX.EXPENSE) {
        // Expenses: Sum of debits
        const amount = expenseMap.get(categoryCode) || 0;
        expenseMap.set(categoryCode, amount + entry.debit);
      }
    }

    const mapToItems = (map: Map<string, number>): IncomeStatementItem[] => {
      return Array.from(map.entries())
        .map(([code, amount]) => ({
          code,
          label: getLedgerLabel(code),
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

  async getStoredReport(
    householdId: string,
    yearMonth: string,
  ): Promise<IncomeStatementData | null> {
    const report = await reportRepository.getReport(
      householdId,
      yearMonth,
      ReportType.INCOME_STATEMENT,
    );
    return report ? (report.data as IncomeStatementData) : null;
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

  /**
   * Generates and saves all three monthly reports sequentially.
   */
  async generateMonthlyFinancialReports(
    householdId: string,
    yearMonth: string,
    userEmail: string,
  ): Promise<{
    incomeStatement: IncomeStatementData;
    balanceSheet: BalanceSheetData;
    cashFlow: CashFlowData;
    timestamp: Date;
  }> {
    const [incomeStatement, balanceSheet, cashFlow] = await Promise.all([
      this.generateIncomeStatement(householdId, yearMonth),
      this.generateBalanceSheet(householdId, yearMonth),
      this.generateCashFlow(householdId, yearMonth),
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

  async generateBalanceSheet(householdId: string, yearMonth: string): Promise<BalanceSheetData> {
    const entries = await reportRepository.getEntriesUntilMonth(householdId, yearMonth);
    const accounts = await accountRepository.getAccounts(householdId);
    const portfolios = await portfolioRepository.list([householdId]);
    const debtAccounts = await debtAccountRepository.getDebtAccounts(householdId);

    // 1. Assets: Cash & Bank (from Snapshots, and only cash and bank)
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

    // 2. Assets: Investment (from Account Snapshots, and only securities)
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

    // 3. Assets: Property (Cumulative from Ledger asset:property*)
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
            label: getLedgerLabel(code),
            amount,
          });
        }
      }
      return { total, items };
    };

    const property = getCumulativeTotal(LEDGER_CODES.ASSET_PROPERTY);

    // 4. Liabilities: Loans (from DebtSnapshots)
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

    // 6. Equity calculation
    const totalEquity = assetsTotal - liabilitiesTotal;

    // 6.1 Opening Equity (Previous month's total equity)
    const [year, month] = yearMonth.split('-').map(Number);
    const prevMonthDate = subMonths(new Date(year, month - 1, 1), 1);
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

    // 6.2 Net Income (Current month's net income)
    const incomeStatement = await this.generateIncomeStatement(householdId, yearMonth);
    const netIncome = incomeStatement.netIncome;

    // 6.3 資本 (equity:capital)
    const getCapitalTotal = (prefix: string) => {
      let total = 0;
      const items: BalanceSheetItem[] = [];
      for (const [code, amount] of ledgerTotals.entries()) {
        if (code.startsWith(prefix)) {
          // amount is debit - credit, so we negate it for equity
          const val = -amount;
          total += val;
          items.push({
            code,
            label: getLedgerLabel(code),
            amount: val,
          });
        }
      }
      return { total, items };
    };
    const capital = getCapitalTotal(LEDGER_CODES.EQUITY_CAPITAL);

    // 6.4 資本利得 (From portfolio snapshot cumulative gain)
    let stockGain = 0;
    const stockGainItems: BalanceSheetItem[] = [];
    for (const portfolio of portfolios) {
      const snapshot = await portfolioSnapshotRepository.get([
        householdId,
        portfolio.id,
        yearMonth,
      ]);
      const amount = snapshot?.performance?.cumulativeGain || 0;
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

  private async getLiquidBalance(householdId: string, yearMonth: string): Promise<number> {
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

  private addToMap(map: Map<string, number>, key: string, value: number) {
    if (value === 0) return;
    map.set(key, (map.get(key) || 0) + value);
  }

  private categorizeLedgerEntry(
    entry: { ledgerCode: string; debit: number; credit: number },
    groups: {
      operating: { inflow: Map<string, number>; outflow: Map<string, number> };
      investing: { inflow: Map<string, number>; outflow: Map<string, number> };
      financing: { inflow: Map<string, number>; outflow: Map<string, number> };
    },
  ) {
    const { ledgerCode: code, debit, credit } = entry;
    const amount = debit - credit;
    console.log('entry', entry);

    if (code.startsWith(LEDGER_PREFIX.INCOME)) {
      this.addToMap(groups.operating.inflow, code, Math.abs(credit));
    } else if (code.startsWith(LEDGER_PREFIX.EXPENSE)) {
      this.addToMap(groups.operating.outflow, code, debit);
    } else if (
      code.startsWith(LEDGER_CODES.ASSET_INVESTMENT) ||
      code.startsWith(LEDGER_CODES.ASSET_PROPERTY)
    ) {
      console.log('code', code, amount);
      if (amount > 0) {
        this.addToMap(groups.investing.outflow, code, amount);
      } else {
        this.addToMap(groups.investing.inflow, code, Math.abs(amount));
      }
    } else if (code.startsWith(LEDGER_PREFIX.LIABILITY) || code.startsWith(LEDGER_PREFIX.EQUITY)) {
      if (credit > 0) this.addToMap(groups.financing.inflow, code, credit);
      if (debit > 0) this.addToMap(groups.financing.outflow, code, debit);
    }
  }

  async generateCashFlow(householdId: string, yearMonth: string): Promise<CashFlowData> {
    // Beginning Balance (Total non-investment account snapshots of previous month)
    const [year, month] = yearMonth.split('-').map(Number);
    const prevYearMonth = format(subMonths(new Date(year, month - 1, 1), 1), 'yyyy-MM');
    const beginningBalance = await this.getLiquidBalance(householdId, prevYearMonth);

    const groups = {
      operating: { inflow: new Map<string, number>(), outflow: new Map<string, number>() },
      investing: { inflow: new Map<string, number>(), outflow: new Map<string, number>() },
      financing: { inflow: new Map<string, number>(), outflow: new Map<string, number>() },
    };

    const entries = await reportRepository.getEntriesByMonth(householdId, yearMonth);
    for (const entry of entries) {
      this.categorizeLedgerEntry(entry, groups);
    }

    const buildGroup = (
      label: string,
      data: { inflow: Map<string, number>; outflow: Map<string, number> },
    ) => {
      const inflowItems: CashFlowItem[] = Array.from(data.inflow.entries())
        .map(([code, amount]) => ({
          code,
          label: getLedgerLabel(code),
          amount,
        }))
        .filter((i) => i.amount > 0);

      const outflowItems: CashFlowItem[] = Array.from(data.outflow.entries())
        .map(([code, amount]) => ({
          code,
          label: getLedgerLabel(code),
          amount,
        }))
        .filter((i) => i.amount > 0);

      const total =
        inflowItems.reduce((s, i) => s + i.amount, 0) -
        outflowItems.reduce((s, i) => s + i.amount, 0);

      return { label, total, inflowItems, outflowItems };
    };

    const operating = buildGroup('營業活動', groups.operating);
    const investing = buildGroup('投資活動', groups.investing);
    const financing = buildGroup('融資活動', groups.financing);

    const netCashChange = operating.total + investing.total + financing.total;
    const endingBalance = beginningBalance + netCashChange;

    // Reconciliation: Actual monthly account balance sum
    const actualBalance = await this.getLiquidBalance(householdId, yearMonth);
    const adjustment = actualBalance - endingBalance;

    return {
      yearMonth,
      operating,
      investing,
      financing,
      netCashChange,
      beginningBalance,
      endingBalance,
      actualBalance,
      adjustment,
    };
  }
}

export const reportService = new ReportService();
