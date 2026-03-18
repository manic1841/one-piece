import { format, subMonths } from 'date-fns';

import { type JournalEntryLine } from '@/domains/ledger/schemas';
import { accountRepository } from '@/infra/repositories/accountRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';
import { CASH_FLOW_MAPPING } from '@/ui/constants/report/cashFlowMapping';
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

    const groupMap = new Map<string, { total: number; subItems: Map<string, number> }>();

    for (const entry of entries) {
      const fullCode = entry.ledgerCode;
      const parts = fullCode.split(':');
      if (parts.length < 2) continue;

      const type = parts[0]; // income or expense
      if (type !== 'income' && type !== 'expense') continue;

      const categoryCode = `${type}:${parts[1]}`;
      const group = groupMap.get(categoryCode) || { total: 0, subItems: new Map() };

      group.total += entry.debit + entry.credit;

      if (parts.length > 2) {
        const subCode = fullCode;
        const subTotal = group.subItems.get(subCode) || 0;
        group.subItems.set(subCode, subTotal + (entry.debit + entry.credit));
      }

      groupMap.set(categoryCode, group);
    }

    const incomeItems: IncomeStatementItem[] = [];
    const expenseItems: IncomeStatementItem[] = [];

    for (const [code, data] of groupMap.entries()) {
      const item: IncomeStatementItem = {
        code,
        label: getLedgerLabel(code),
        amount: Math.abs(data.total),
        subItems:
          data.subItems.size > 0
            ? Array.from(data.subItems.entries())
                .map(([subCode, subAmount]) => ({
                  code: subCode,
                  label: getLedgerLabel(subCode),
                  amount: Math.abs(subAmount),
                }))
                .sort((a, b) => b.amount - a.amount)
            : undefined,
      };

      if (code.startsWith('income:')) {
        incomeItems.push(item);
      } else {
        expenseItems.push(item);
      }
    }

    incomeItems.sort((a, b) => b.amount - a.amount);
    expenseItems.sort((a, b) => b.amount - a.amount);

    const incomeTotal = incomeItems.reduce((sum, item) => sum + item.amount, 0);
    const expenseTotal = expenseItems.reduce((sum, item) => sum + item.amount, 0);
    const netIncome = incomeTotal - expenseTotal;

    return {
      yearMonth,
      incomeTotal,
      expenseTotal,
      netIncome,
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
    data: IncomeStatementData | BalanceSheetData,
    userEmail: string,
  ): Promise<void> {
    const type = 'incomeTotal' in data ? ReportType.INCOME_STATEMENT : ReportType.BALANCE_SHEET;
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

  async generateBalanceSheet(householdId: string, yearMonth: string): Promise<BalanceSheetData> {
    const entries = await reportRepository.getEntriesUntilMonth(householdId, yearMonth);
    const accounts = await accountRepository.getAccounts(householdId);

    // 1. Assets: Cash & Bank (from Snapshots)
    let cashAndBankTotal = 0;
    const accountItems: BalanceSheetItem[] = [];

    for (const account of accounts) {
      if (
        account.category === 'bank' ||
        account.category === 'cash' ||
        account.category === 'securities'
      ) {
        const snapshot =
          (await accountRepository.getSnapshot(householdId, account.id, yearMonth)) ||
          (await accountRepository.getLatestSnapshot(householdId, account.id));
        const amount = snapshot?.amount || 0;
        cashAndBankTotal += amount;
        accountItems.push({
          code: `account:${account.id}`,
          label: account.name,
          amount,
        });
      }
    }

    // 2. Cumulative Ledger Items
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

    const investment = getCumulativeTotal('asset:investment');
    const receivable = getCumulativeTotal('asset:receivable');

    // Liabilities (Credit and Loan usually have Credit balance, so we use credit - debit for positive display)
    const getLiabilityTotal = (prefix: string) => {
      let total = 0;
      const items: BalanceSheetItem[] = [];
      for (const [code, amount] of ledgerTotals.entries()) {
        if (code.startsWith(prefix)) {
          // amount is debit - credit, so we negate it for liability
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

    const creditPayable = getLiabilityTotal('liability:credit');
    const loan = getLiabilityTotal('liability:loan');

    const assetsTotal = cashAndBankTotal + investment.total + receivable.total;
    const liabilitiesTotal = creditPayable.total + loan.total;
    const equity = assetsTotal - liabilitiesTotal;

    return {
      yearMonth,
      assets: {
        total: assetsTotal,
        groups: {
          cash: { label: '現金與銀行', total: cashAndBankTotal, items: accountItems },
          investment: { label: '投資資產', total: investment.total, items: investment.items },
          receivable: { label: '應收款項', total: receivable.total, items: receivable.items },
        },
      },
      liabilities: {
        total: liabilitiesTotal,
        groups: {
          credit: { label: '信用卡應付', total: creditPayable.total, items: creditPayable.items },
          loan: { label: '貸款', total: loan.total, items: loan.items },
        },
      },
      equity,
    };
  }

  async generateCashFlow(householdId: string, yearMonth: string): Promise<CashFlowData> {
    const entries = await reportRepository.getEntriesByMonth(householdId, yearMonth);
    const prevMonth = format(subMonths(new Date(yearMonth + '-01'), 1), 'yyyy-MM');

    // Get Beginning Balance (Total from all account snapshots of previous month)
    const accounts = await accountRepository.getAccounts(householdId);
    let beginningBalance = 0;
    for (const account of accounts) {
      if (
        account.category === 'bank' ||
        account.category === 'cash' ||
        account.category === 'securities'
      ) {
        const snapshot =
          (await accountRepository.getSnapshot(householdId, account.id, prevMonth)) ||
          (await accountRepository.getLatestSnapshot(householdId, account.id));
        beginningBalance += snapshot?.amount || 0;
      }
    }

    const operatingInflow: CashFlowItem[] = [];
    const operatingOutflow: CashFlowItem[] = [];
    const investingInflow: CashFlowItem[] = [];
    const investingOutflow: CashFlowItem[] = [];
    const financingInflow: CashFlowItem[] = [];
    const financingOutflow: CashFlowItem[] = [];

    const processEntry = (
      entry: JournalEntryLine,
      targetIn: CashFlowItem[],
      targetOut: CashFlowItem[],
    ) => {
      // For Income/Expense: usually only one of debit or credit is non-zero
      // But we use (debit + credit) and Math.abs to be safe
      const amount = Math.abs(entry.debit + entry.credit);
      if (amount === 0) return;

      const item = {
        code: entry.ledgerCode,
        label: getLedgerLabel(entry.ledgerCode),
        amount,
      };

      // Rules:
      // income:* -> credit is inflow
      // expense:* -> debit is outflow
      if (entry.ledgerCode.startsWith('income:')) {
        targetIn.push(item);
      } else {
        targetOut.push(item);
      }
    };

    for (const entry of entries) {
      const code = entry.ledgerCode;

      // Special handling for liability:loan
      if (code === 'liability:loan') {
        const amount = Math.abs(entry.debit - entry.credit);
        if (amount === 0) continue;
        const item = { code, label: getLedgerLabel(code), amount };
        if (entry.credit > entry.debit) {
          financingInflow.push(item); // 借款入帳
        } else {
          financingOutflow.push(item); // 還款
        }
        continue;
      }

      // Mapping rules
      if (
        (CASH_FLOW_MAPPING.operating.income as readonly string[]).includes(code) ||
        (CASH_FLOW_MAPPING.operating.expense as readonly string[]).includes(code)
      ) {
        processEntry(entry, operatingInflow, operatingOutflow);
      } else if (
        (CASH_FLOW_MAPPING.investing.income as readonly string[]).includes(code) ||
        (CASH_FLOW_MAPPING.investing.expense as readonly string[]).includes(code)
      ) {
        // investment: credit is return (inflow), asset:investment: debit is purchase (outflow)
        if (code === 'income:investment') {
          investingInflow.push({
            code,
            label: getLedgerLabel(code),
            amount: Math.abs(entry.credit),
          });
        } else {
          investingOutflow.push({
            code,
            label: getLedgerLabel(code),
            amount: Math.abs(entry.debit),
          });
        }
      } else if (
        (CASH_FLOW_MAPPING.financing.income as readonly string[]).includes(code) ||
        (CASH_FLOW_MAPPING.financing.expense as readonly string[]).includes(code)
      ) {
        if (code === 'liability:credit') {
          financingOutflow.push({
            code,
            label: getLedgerLabel(code),
            amount: Math.abs(entry.debit),
          });
        }
      }
    }

    const sum = (items: CashFlowItem[]) => items.reduce((acc, i) => acc + i.amount, 0);

    const operatingTotal = sum(operatingInflow) - sum(operatingOutflow);
    const investingTotal = sum(investingInflow) - sum(investingOutflow);
    const financingTotal = sum(financingInflow) - sum(financingOutflow);

    const netCashChange = operatingTotal + investingTotal + financingTotal;
    const endingBalance = beginningBalance + netCashChange;

    return {
      yearMonth,
      operating: {
        label: '營業活動',
        total: operatingTotal,
        inflowItems: operatingInflow,
        outflowItems: operatingOutflow,
      },
      investing: {
        label: '投資活動',
        total: investingTotal,
        inflowItems: investingInflow,
        outflowItems: investingOutflow,
      },
      financing: {
        label: '融資活動',
        total: financingTotal,
        inflowItems: financingInflow,
        outflowItems: financingOutflow,
      },
      netCashChange,
      beginningBalance,
      endingBalance,
    };
  }
}

export const reportService = new ReportService();
