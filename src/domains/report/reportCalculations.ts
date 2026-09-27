import { LEDGER_CODES, LEDGER_PREFIX } from '@/domains/ledger/constants';
import { type JournalEntryLine } from '@/domains/ledger/schemas';

import { type CashFlowGroups, categorizeLedgerEntry } from './cashFlowUtils';
import {
  type BalanceSheetData,
  type BalanceSheetItem,
  type CashFlowData,
  type CashFlowItem,
  type IncomeStatementData,
} from './schemas';

export type ReportLabelResolver = (code: string, fallbackLabel?: string) => string;

// ── Income Statement ──

export interface IncomeStatementInput {
  yearMonth: string;
  entries: JournalEntryLine[];
  labelResolver?: ReportLabelResolver;
}

type ReportSubItem = { code: string; label: string; amount: number };

// Detail labels fall back to the raw detail segment (`code` minus the parent
// prefix). Nested display labels compose "parent label › detail label" so the
// persisted report stays directly displayable without re-resolution.
const composeNestedLabel = (parentLabel: string, detailLabel: string) =>
  `${parentLabel} › ${detailLabel}`;

const rollUpTotals = (
  totals: Map<string, number>,
  resolveLabel: (code: string, fallback?: string) => string,
) => {
  type Node = { amount: number; subItems: ReportSubItem[] };
  const parents = new Map<string, Node>();
  for (const [code, amount] of totals.entries()) {
    const [type, category, ...rest] = code.split(':');
    const parentKey = `${type}:${category}`;
    const node = parents.get(parentKey) ?? { amount: 0, subItems: [] };
    node.amount += amount;
    if (rest.length > 0) {
      node.subItems.push({ code, label: resolveLabel(code), amount });
    }
    parents.set(parentKey, node);
  }
  return Array.from(parents.entries())
    .map(([code, node]) => {
      const parentLabel = resolveLabel(code);
      const subItems = node.subItems.map((sub) => ({
        ...sub,
        amount: Math.abs(sub.amount),
        label: composeNestedLabel(parentLabel, sub.label),
      }));
      return {
        code,
        label: parentLabel,
        amount: Math.abs(node.amount),
        subItems: subItems.length > 0 ? subItems.sort((a, b) => b.amount - a.amount) : undefined,
      };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
};

export function calculateIncomeStatement(input: IncomeStatementInput): IncomeStatementData {
  const { yearMonth, entries, labelResolver } = input;

  const resolveLabel = (code: string, fallback?: string) =>
    labelResolver ? labelResolver(code, fallback) : (fallback ?? code);

  // Roll-up: the parent `type:category` row carries the summed amount, detail
  // codes nest as subItems beneath it. Rows without detail codes render flat.
  const rollUp = (totals: Map<string, number>) => rollUpTotals(totals, resolveLabel);

  const incomeTotals = new Map<string, number>();
  const expenseTotals = new Map<string, number>();
  for (const entry of entries) {
    const parts = entry.ledgerCode.split(':');
    if (parts.length < 2) continue;
    if (parts[0] === LEDGER_PREFIX.INCOME) {
      incomeTotals.set(entry.ledgerCode, (incomeTotals.get(entry.ledgerCode) || 0) + entry.credit);
    } else if (parts[0] === LEDGER_PREFIX.EXPENSE) {
      expenseTotals.set(entry.ledgerCode, (expenseTotals.get(entry.ledgerCode) || 0) + entry.debit);
    }
  }

  const incomeItems = rollUp(incomeTotals);
  const expenseItems = rollUp(expenseTotals);

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

// ── Balance Sheet ──

export interface AccountSnapshotData {
  accountId: string;
  amount: number;
}

export interface DebtSnapshotData {
  debtId: string;
  closingBalance: number;
}

export interface PortfolioSnapshotData {
  portfolioId: string;
  gain: number;
}

export interface BalanceSheetInput {
  yearMonth: string;
  entries: JournalEntryLine[];
  monthlyEntries: JournalEntryLine[];
  accounts: { id: string; name: string; category: string }[];
  portfolios: { id: string; name: string }[];
  debtAccounts: { id: string; name: string }[];
  accountSnapshots: AccountSnapshotData[];
  debtSnapshots: DebtSnapshotData[];
  portfolioSnapshots: PortfolioSnapshotData[];
  prevBalanceSheet: BalanceSheetData | null;
  incomeStatement: IncomeStatementData;
  labelResolver?: ReportLabelResolver;
}

export function calculateBalanceSheet(input: BalanceSheetInput): BalanceSheetData {
  const {
    yearMonth,
    entries,
    monthlyEntries,
    accounts,
    portfolios,
    debtAccounts,
    accountSnapshots,
    debtSnapshots,
    portfolioSnapshots,
    prevBalanceSheet,
    incomeStatement,
    labelResolver,
  } = input;

  const resolveLabel = (code: string, fallback?: string) =>
    labelResolver ? labelResolver(code, fallback) : (fallback ?? code);

  const accountSnapshotMap = new Map(accountSnapshots.map((s) => [s.accountId, s.amount]));

  let cashAndBankTotal = 0;
  const accountItems: BalanceSheetItem[] = [];
  for (const account of accounts) {
    if (account.category === 'bank' || account.category === 'cash') {
      const amount = accountSnapshotMap.get(account.id) || 0;
      cashAndBankTotal += amount;
      accountItems.push({ code: `account:${account.id}`, label: account.name, amount });
    }
  }

  let investmentTotalValue = 0;
  const investmentItems: BalanceSheetItem[] = [];
  for (const account of accounts) {
    if (account.category === 'securities') {
      const amount = accountSnapshotMap.get(account.id) || 0;
      investmentTotalValue += amount;
      investmentItems.push({ code: `account:${account.id}`, label: account.name, amount });
    }
  }

  const ledgerTotals = new Map<string, number>();
  for (const entry of entries) {
    const current = ledgerTotals.get(entry.ledgerCode) || 0;
    ledgerTotals.set(entry.ledgerCode, current + (entry.debit - entry.credit));
  }

  const getCumulativeTotal = (prefix: string) => {
    let total = 0;
    let matched = false;
    const subItems: BalanceSheetItem[] = [];
    for (const [code, amount] of ledgerTotals.entries()) {
      if (code.startsWith(prefix)) {
        matched = true;
        total += amount;
        if (code !== prefix) {
          subItems.push({
            code,
            label: resolveLabel(code, code.slice(prefix.length + 1)),
            amount,
          });
        }
      }
    }
    const items: BalanceSheetItem[] = matched
      ? [
          {
            code: prefix,
            label: resolveLabel(prefix, prefix),
            amount: total,
            subItems:
              subItems.length > 0 ? subItems.sort((a, b) => b.amount - a.amount) : undefined,
          },
        ]
      : [];
    return { total, items };
  };

  const property = getCumulativeTotal(LEDGER_CODES.ASSET_PROPERTY);

  const debtSnapshotMap = new Map(debtSnapshots.map((s) => [s.debtId, s.closingBalance]));
  let debtTotal = 0;
  const debtItems: BalanceSheetItem[] = [];
  for (const debt of debtAccounts) {
    const amount = debtSnapshotMap.get(debt.id) || 0;
    debtTotal += amount;
    debtItems.push({ code: `debt:${debt.id}`, label: debt.name, amount });
  }

  const assetsTotal = cashAndBankTotal + investmentTotalValue + property.total;
  const liabilitiesTotal = debtTotal;
  const totalEquity = assetsTotal - liabilitiesTotal;

  const openingEquity = prevBalanceSheet?.equity?.total ?? 0;
  const netIncome = incomeStatement.netIncome;

  const monthlyLedgerTotals = new Map<string, number>();
  for (const entry of monthlyEntries) {
    const current = monthlyLedgerTotals.get(entry.ledgerCode) || 0;
    monthlyLedgerTotals.set(entry.ledgerCode, current + (entry.debit - entry.credit));
  }

  const getCapitalTotal = (prefix: string) => {
    let total = 0;
    let matched = false;
    const subItems: BalanceSheetItem[] = [];
    for (const [code, amount] of monthlyLedgerTotals.entries()) {
      if (code.startsWith(prefix)) {
        const val = Math.abs(amount);
        matched = true;
        total += val;
        if (code !== prefix) {
          subItems.push({
            code,
            label: resolveLabel(code, code.slice(prefix.length + 1)),
            amount: val,
          });
        }
      }
    }
    const items: BalanceSheetItem[] = matched
      ? [
          {
            code: prefix,
            label: resolveLabel(prefix, prefix),
            amount: total,
            subItems:
              subItems.length > 0 ? subItems.sort((a, b) => b.amount - a.amount) : undefined,
          },
        ]
      : [];
    return { total, items };
  };
  const capital = getCapitalTotal(LEDGER_CODES.EQUITY_CAPITAL);

  const portfolioSnapshotMap = new Map(portfolioSnapshots.map((s) => [s.portfolioId, s.gain]));
  let stockGain = 0;
  for (const portfolio of portfolios) {
    stockGain += portfolioSnapshotMap.get(portfolio.id) || 0;
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
        stock_gain: { label: '股票報酬', total: stockGain, items: [] },
        adjustment: { label: '調整', total: adjustment, items: [] },
      },
    },
  };
}

// ── Cash Flow ──

export interface CashFlowInput {
  yearMonth: string;
  entries: JournalEntryLine[];
  beginningBalance: number;
  actualBalance: number;
  labelResolver?: ReportLabelResolver;
}

export function calculateCashFlow(input: CashFlowInput): CashFlowData {
  const { yearMonth, entries, beginningBalance, actualBalance, labelResolver } = input;

  const resolveLabel = (code: string, fallback?: string) =>
    labelResolver ? labelResolver(code, fallback) : (fallback ?? code);

  const groups: CashFlowGroups = {
    operating: { inflow: new Map(), outflow: new Map() },
    investing: { inflow: new Map(), outflow: new Map() },
    financing: { inflow: new Map(), outflow: new Map() },
  };

  for (const entry of entries) {
    categorizeLedgerEntry(entry, groups);
  }

  // Roll-up: parent `type:category` rows carry the summed amount; detail codes
  // nest as subItems. Detail labels fall back to the raw detail segment, then
  // compose "parent label › detail label" for direct display.
  const buildItems = (totals: Map<string, number>): CashFlowItem[] => {
    type Node = { amount: number; subItems: CashFlowItem[] };
    const parents = new Map<string, Node>();
    for (const [code, amount] of totals.entries()) {
      const [type, category, ...rest] = code.split(':');
      const parentKey = `${type}:${category}`;
      const node = parents.get(parentKey) ?? { amount: 0, subItems: [] };
      node.amount += amount;
      if (rest.length > 0) {
        node.subItems.push({
          code,
          label: resolveLabel(code, code.slice(parentKey.length + 1)),
          amount,
        });
      }
      parents.set(parentKey, node);
    }
    return Array.from(parents.entries())
      .map(([code, node]) => {
        const parentLabel = resolveLabel(code, code);
        const subItems = node.subItems.map((sub) => ({
          ...sub,
          label: composeNestedLabel(parentLabel, sub.label),
        }));
        return {
          code,
          label: parentLabel,
          amount: node.amount,
          subItems: subItems.length > 0 ? subItems : undefined,
        };
      })
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  };

  const buildGroup = (
    label: string,
    data: { inflow: Map<string, number>; outflow: Map<string, number> },
  ) => {
    const inflowItems = buildItems(data.inflow);
    const outflowItems = buildItems(data.outflow);

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

// ── Liquid Balance ──

const LIQUID_ACCOUNT_CATEGORIES = ['bank', 'cash'] as const;

export function calculateLiquidBalance(
  accounts: { id: string; category: string }[],
  snapshots: AccountSnapshotData[],
): number {
  const snapshotMap = new Map(snapshots.map((s) => [s.accountId, s.amount]));
  return accounts
    .filter((account) =>
      (LIQUID_ACCOUNT_CATEGORIES as readonly string[]).includes(account.category),
    )
    .reduce((total, account) => total + (snapshotMap.get(account.id) || 0), 0);
}
