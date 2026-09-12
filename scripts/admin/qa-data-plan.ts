/**
 * Pure QA seed plan builder.
 *
 * Builds the full deterministic document set for `qa:seed` in memory.
 * Snapshots and financial reports are derived through the pure domain
 * calculators (project settlement, debt payment, report calculations) so
 * every seeded number stays consistent with the seeded transactions.
 *
 * Import boundary: firebase/firebase-admin are forbidden here. Only pure
 * domain/shared modules (zod schemas + calculators) may be imported; the
 * writer script (seed-qa-data.ts) owns all I/O.
 */
import { z } from 'zod';

import { AccountSchema, AccountSnapshotSchema } from '@/domains/account/schemas';
import {
  AccountCategory,
  CurrencyType,
} from '@/domains/account/types/categories';
import { AllocationSchema, type AllocationItem } from '@/domains/allocation/schemas';
import { AllocationTemplateSchema } from '@/domains/allocation/templateSchemas';
import { DebtAccountSchema, DebtSnapshotSchema } from '@/domains/debt/schemas';
import {
  buildDebtPaymentEntries,
  calculateDebtPayment,
} from '@/domains/debt/debtPaymentCalculator';
import { IntentType, LEDGER_CODES } from '@/domains/ledger/constants';
import {
  CustomLedgerCodeSchema,
  IntentMappingSchema,
  TransactionSchema,
  type JournalEntryLine,
} from '@/domains/ledger/schemas';
import { calculateProjectSettlementSnapshot } from '@/domains/project/calculators/projectSettlementCalculator';
import { ProjectSchema, ProjectSnapshotSchema } from '@/domains/project/schemas';
import { ProjectCategory } from '@/domains/project/types/categories';
import { PortfolioSchema, PortfolioSnapshotSchema } from '@/domains/portfolio/schemas';
import { FinancialReportSchema, ReportType } from '@/domains/report/schemas';
import {
  calculateBalanceSheet,
  calculateCashFlow,
  calculateIncomeStatement,
  type BalanceSheetData,
} from '@/domains/report/reportCalculations';
import {
  RetirementExpenseCategorySchema,
  RetirementIncomeSourceSchema,
  RetirementPlanSchema,
} from '@/domains/retirement/schemas';

export interface QaSeedIdentity {
  uid: string;
  email: string;
  householdId: string;
}

export interface SeedDoc {
  /** Collection path relative to the Firestore root. */
  collectionPath: string;
  id: string;
  data: Record<string, unknown>;
}

// Deterministic clock: identical output for identical input on every run.
export const QA_SEED_FIXED_NOW = new Date('2026-09-12T00:00:00');

// Fixed data window (design decision): salaries span full-year 2025 so the
// retirement income stream's sampleYear=2025 is backed by real entries.
const SALARY_START = { year: 2025, month: 1 };
const SALARY_END = { year: 2026, month: 9 };
const SALARY_AMOUNT = 60_000;
const SAMPLE_YEAR = 2025;
const SALARY_TOTAL_2025 = SALARY_AMOUNT * 12;

const REPORT_MONTHS = ['2026-07', '2026-08', '2026-09'];
const PLAN_ID = 'plan_qa_retirement';
const MORTGAGE_ID = 'debt_mortgage';
const MORTGAGE_PRINCIPAL = 8_000_000;
const MORTGAGE_RATE = 2.4;
const MORTGAGE_PAYMENT = 40_000;

const SECURITIES_MARKET_VALUE: Record<string, number> = {
  '2026-03': 20_000,
  '2026-04': 20_000,
  '2026-05': 20_000,
  '2026-06': 20_000,
  '2026-07': 20_800,
  '2026-08': 21_600,
  '2026-09': 21_200,
};

const ym = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

const monthRange = (start: { year: number; month: number }, end: { year: number; month: number }) => {
  const months: { year: number; month: number }[] = [];
  let { year, month } = start;
  while (year < end.year || (year === end.year && month <= end.month)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
};

interface InternalTxn {
  id: string;
  yearMonth: string;
  date: Date;
  intentType: string;
  amount?: number;
  projectId?: string | null;
  fromProjectId?: string | null;
  toProjectId?: string | null;
  entries: JournalEntryLine[];
}

interface Builder {
  identity: QaSeedIdentity;
  docs: SeedDoc[];
}

const hh = (identity: QaSeedIdentity, ...parts: string[]) =>
  ['households', identity.householdId, ...parts].join('/');

const audit = (identity: QaSeedIdentity) => ({
  createdBy: identity.email,
  updatedBy: identity.email,
  createdAt: QA_SEED_FIXED_NOW,
  updatedAt: QA_SEED_FIXED_NOW,
});

// Shape matching BaseSchema's audit fields, for extending standalone schemas
// that don't include BaseSchema but whose stored docs do carry audit fields.
const auditShape = {
  createdBy: z.string(),
  createdAt: z.date(),
  updatedBy: z.string(),
  updatedAt: z.date(),
};

const emit = (
  b: Builder,
  schema: z.ZodTypeAny,
  collectionPath: string,
  id: string,
  data: object,
) => {
  schema.parse(data); // schema drift fails the seed loudly before any write
  b.docs.push({ collectionPath, id, data: data as Record<string, unknown> });
};

const entryLedgerCodes = (entries: JournalEntryLine[]) =>
  Array.from(new Set(entries.map((e) => e.ledgerCode))).sort();

const cashDelta = (entries: JournalEntryLine[]) =>
  entries
    .filter((e) => e.ledgerCode === LEDGER_CODES.ASSET_CASH)
    .reduce((sum, e) => sum + e.debit - e.credit, 0);

const buildStaticDocs = (b: Builder) => {
  const { identity } = b;

  const projects = [
    { id: 'proj_daily', name: '日常開銷', color: '#4e8cff', icon: 'daily', category: ProjectCategory.OPERATING, isActive: true },
    { id: 'proj_housing', name: '居住房貸', color: '#74b9ff', icon: 'home', category: ProjectCategory.FINANCING, isActive: true },
    { id: 'proj_leisure', name: '休閒娛樂', color: '#e84393', icon: 'game', category: ProjectCategory.OPERATING, isActive: true },
    { id: 'proj_pet', name: '毛孩開銷', color: '#fdcb6e', icon: 'pet', category: ProjectCategory.OPERATING, isActive: true },
    { id: 'proj_allowance', name: '零用錢', color: '#a29bfe', icon: 'gift', category: ProjectCategory.PERSONAL, isActive: true },
    { id: 'proj_legacy', name: '已停用專案', color: '#b2bec3', icon: 'box', category: ProjectCategory.OPERATING, isActive: false },
  ];
  projects.forEach((p, index) => {
    emit(b, ProjectSchema, hh(identity, 'projects'), p.id, {
      id: p.id,
      name: p.name,
      color: p.color,
      icon: p.icon,
      order: index + 1,
      category: p.category,
      isActive: p.isActive,
      ...audit(identity),
    });
  });

  const accounts = [
    { id: 'acc_cash', name: '現金帳戶', category: AccountCategory.CASH },
    { id: 'acc_securities', name: '券商帳戶', category: AccountCategory.SECURITIES },
  ];
  accounts.forEach((a, index) => {
    emit(b, AccountSchema, hh(identity, 'accounts'), a.id, {
      id: a.id,
      name: a.name,
      category: a.category,
      currency: CurrencyType.TWD,
      order: index + 1,
      isActive: true,
      ...audit(identity),
    });
  });

  emit(b, CustomLedgerCodeSchema, hh(identity, 'ledgerCodes'), 'expense:pets', {
    id: 'expense:pets',
    code: 'expense:pets',
    label: '毛孩開銷',
    type: 'expense',
    isCustom: true,
    isActive: true,
    ...audit(identity),
  });

  emit(b, IntentMappingSchema, hh(identity, 'intent_mappings'), 'imp_pet_expense', {
    id: 'imp_pet_expense',
    intent: 'PET_EXPENSE',
    debitLedgerCode: 'expense:pets',
    creditLedgerCode: LEDGER_CODES.ASSET_CASH,
    creditUserSelect: false,
    ...audit(identity),
  });

  emit(b, AllocationTemplateSchema, hh(identity, 'allocationTemplates'), 'tmpl_salary_default', {
    id: 'tmpl_salary_default',
    name: '薪資預設分配',
    ledgerCode: LEDGER_CODES.INCOME_SALARY,
    isDefault: true,
    items: [
      { projectId: 'proj_daily', percentage: 60 },
      { projectId: 'proj_housing', percentage: 25 },
      { projectId: 'proj_leisure', percentage: 15 },
    ],
    ...audit(identity),
  });

  emit(b, PortfolioSchema, hh(identity, 'portfolios'), 'pf_core', {
    id: 'pf_core',
    name: '核心投資組合',
    accountIds: ['acc_securities'],
    isActive: true,
    order: 1,
    ...audit(identity),
  });

  // Settled consumer loan: exercises Active=false + closedAt (ADR-0032 import filter).
  emit(b, DebtAccountSchema, hh(identity, 'debtAccounts'), 'debt_loan_personal', {
    id: 'debt_loan_personal',
    name: '已結清信貸',
    type: 'loan',
    repaymentType: 'equal_payment',
    originalAmount: 300_000,
    currentBalance: 0,
    interestRate: 3.5,
    startDate: new Date(2025, 2, 1),
    endDate: new Date(2026, 5, 15),
    monthlyPayment: 10_500,
    linkedLedgerCode: LEDGER_CODES.LIABILITY_LOAN,
    isActive: false,
    closedAt: new Date(2026, 5, 15),
    ...audit(identity),
  });
};

const buildSalaryDocs = (b: Builder, txns: InternalTxn[]) => {
  const { identity } = b;
  for (const { year, month } of monthRange(SALARY_START, SALARY_END)) {
    const id = `txn_salary_${ym(year, month)}`;
    const date = new Date(year, month - 1, 5);
    const entries: JournalEntryLine[] = [
      { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: 'acc_cash', debit: SALARY_AMOUNT, credit: 0 },
      { ledgerCode: LEDGER_CODES.INCOME_SALARY, debit: 0, credit: SALARY_AMOUNT },
    ];
    txns.push({ id, yearMonth: ym(year, month), date, intentType: IntentType.INCOME, amount: SALARY_AMOUNT, entries });

    emit(b, TransactionSchema, hh(identity, 'transactions'), id, {
      id,
      date,
      description: `${ym(year, month)} 月薪`,
      intentType: IntentType.INCOME,
      amount: SALARY_AMOUNT,
      projectId: null,
      allocationId: id,
      entries,
      ledgerCodes: entryLedgerCodes(entries),
      ...audit(identity),
    });

    const items: AllocationItem[] = [
      { projectId: 'proj_daily', percentage: 60, amount: 36_000 },
      { projectId: 'proj_housing', percentage: 25, amount: 15_000 },
      { projectId: 'proj_leisure', percentage: 15, amount: 9_000 },
    ];
    emit(b, AllocationSchema, hh(identity, 'allocations'), id, {
      id,
      date,
      yearMonth: ym(year, month),
      description: `${ym(year, month)} 薪資分配`,
      sourceTransactionId: id,
      direction: 'INCOME',
      totalAmount: SALARY_AMOUNT,
      items,
      projectIds: items.map((i) => i.projectId),
      ...audit(identity),
    });
  }
};

const EXPENSE_SPECS: { ymKey: string; day: number; desc: string; project: string; ledger: string; amount: number }[] = [
  { ymKey: '2026-04', day: 8, desc: '超市採買', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_FOOD, amount: 1_800 },
  { ymKey: '2026-04', day: 12, desc: '捷運儲值', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION, amount: 600 },
  { ymKey: '2026-04', day: 20, desc: '飼料', project: 'proj_pet', ledger: 'expense:pets', amount: 1_200 },
  { ymKey: '2026-05', day: 8, desc: '超市採買', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_FOOD, amount: 1_800 },
  { ymKey: '2026-05', day: 12, desc: '捷運儲值', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION, amount: 600 },
  { ymKey: '2026-05', day: 18, desc: '電影票', project: 'proj_leisure', ledger: LEDGER_CODES.EXPENSE_ENTERTAINMENT, amount: 900 },
  { ymKey: '2026-06', day: 8, desc: '超市採買', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_FOOD, amount: 1_800 },
  { ymKey: '2026-06', day: 12, desc: '捷運儲值', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION, amount: 600 },
  { ymKey: '2026-06', day: 22, desc: '獸醫門診', project: 'proj_pet', ledger: 'expense:pets', amount: 3_500 },
  { ymKey: '2026-07', day: 8, desc: '超市採買', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_FOOD, amount: 1_800 },
  { ymKey: '2026-07', day: 12, desc: '捷運儲值', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION, amount: 600 },
  { ymKey: '2026-07', day: 26, desc: '演唱會', project: 'proj_leisure', ledger: LEDGER_CODES.EXPENSE_ENTERTAINMENT, amount: 2_400 },
  { ymKey: '2026-08', day: 8, desc: '超市採買', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_FOOD, amount: 1_800 },
  { ymKey: '2026-08', day: 12, desc: '捷運儲值', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION, amount: 600 },
  { ymKey: '2026-08', day: 15, desc: '零用錢支出', project: 'proj_allowance', ledger: LEDGER_CODES.EXPENSE_OTHER, amount: 3_000 },
  { ymKey: '2026-09', day: 8, desc: '超市採買', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_FOOD, amount: 1_800 },
  { ymKey: '2026-09', day: 12, desc: '捷運儲值', project: 'proj_daily', ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION, amount: 600 },
];

const buildExpenseAndSpecialDocs = (b: Builder, txns: InternalTxn[]) => {
  const { identity } = b;

  const addTxn = (
    id: string,
    date: Date,
    intentType: string,
    amount: number,
    description: string,
    entries: JournalEntryLine[],
    extra: { projectId?: string; fromProjectId?: string; toProjectId?: string; debtAccountId?: string } = {},
  ) => {
    txns.push({
      id,
      yearMonth: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      date,
      intentType,
      amount,
      projectId: extra.projectId ?? null,
      fromProjectId: extra.fromProjectId ?? null,
      toProjectId: extra.toProjectId ?? null,
      entries,
    });
    emit(b, TransactionSchema, hh(identity, 'transactions'), id, {
      id,
      date,
      description,
      intentType,
      amount,
      projectId: extra.projectId ?? null,
      allocationId: null,
      debtAccountId: extra.debtAccountId ?? null,
      fromProjectId: extra.fromProjectId ?? null,
      toProjectId: extra.toProjectId ?? null,
      entries,
      ledgerCodes: entryLedgerCodes(entries),
      ...audit(identity),
    });
  };

  // Mortgage drawdown: property asset vs mortgage liability (ADR-0016 borrow shape).
  addTxn(
    'txn_borrow_mortgage',
    new Date(2026, 0, 5),
    IntentType.LIABILITY_BORROW,
    MORTGAGE_PRINCIPAL,
    '房貸撥款－購屋',
    [
      { ledgerCode: LEDGER_CODES.ASSET_PROPERTY, debit: MORTGAGE_PRINCIPAL, credit: 0 },
      { ledgerCode: LEDGER_CODES.LIABILITY_MORTGAGE, debit: 0, credit: MORTGAGE_PRINCIPAL },
    ],
  );

  // Securities purchase funded by cash.
  addTxn(
    'txn_invest_2026_03',
    new Date(2026, 2, 15),
    IntentType.INVESTMENT,
    20_000,
    '買進 0050',
    [
      { ledgerCode: LEDGER_CODES.ASSET_INVESTMENT, debit: 20_000, credit: 0 },
      { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: 'acc_cash', debit: 0, credit: 20_000 },
    ],
  );

  // Historical project transfer: implementation paused (ADR-0042), legal legacy data.
  addTxn(
    'txn_transfer_2026_02',
    new Date(2026, 1, 10),
    IntentType.TRANSFER,
    5_000,
    '專案撥款：休閒 → 日常（歷史資料）',
    [
      { ledgerCode: LEDGER_CODES.ASSET_CASH, debit: 5_000, credit: 0 },
      { ledgerCode: LEDGER_CODES.ASSET_CASH, debit: 0, credit: 5_000 },
    ],
    { fromProjectId: 'proj_leisure', toProjectId: 'proj_daily' },
  );

  // Manual journal entry: cash count adjustment.
  addTxn(
    'txn_manual_2026_05',
    new Date(2026, 4, 20),
    IntentType.MANUAL,
    200,
    '現金盤點調整',
    [
      { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: 'acc_cash', debit: 200, credit: 0 },
      { ledgerCode: LEDGER_CODES.INCOME_REFUND, debit: 0, credit: 200 },
    ],
  );

  EXPENSE_SPECS.forEach((spec) => {
    const [y, m] = spec.ymKey.split('-').map(Number);
    addTxn(
      `txn_expense_${spec.ymKey}_${spec.day}`,
      new Date(y, m - 1, spec.day),
      IntentType.EXPENSE,
      spec.amount,
      spec.desc,
      [
        { ledgerCode: spec.ledger, debit: spec.amount, credit: 0 },
        { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: 'acc_cash', debit: 0, credit: spec.amount },
      ],
      { projectId: spec.project },
    );
  });
};

const buildMortgageDocs = (b: Builder, txns: InternalTxn[]) => {
  const { identity } = b;
  let balance = MORTGAGE_PRINCIPAL;
  const closingByMonth: Record<string, number> = {};
  let interestTotal = 0;

  for (let month = 2; month <= 9; month += 1) {
    const paymentDate = new Date(2026, month - 1, 5);
    const calculation = calculateDebtPayment({
      currentBalance: balance,
      interestRate: MORTGAGE_RATE,
      totalPayment: MORTGAGE_PAYMENT,
      paymentDate,
      startDate: new Date(2026, 0, 5),
      graceEndDate: null,
    });
    interestTotal += calculation.interest;
    const entries = buildDebtPaymentEntries(LEDGER_CODES.LIABILITY_MORTGAGE, calculation, MORTGAGE_PAYMENT);
    const id = `txn_debtpay_${ym(2026, month)}`;
    txns.push({
      id,
      yearMonth: ym(2026, month),
      date: paymentDate,
      intentType: IntentType.DEBT_PAYMENT,
      amount: MORTGAGE_PAYMENT,
      entries,
    });
    emit(b, TransactionSchema, hh(identity, 'transactions'), id, {
      id,
      date: paymentDate,
      description: `${ym(2026, month)} 房貸還款`,
      intentType: IntentType.DEBT_PAYMENT,
      amount: MORTGAGE_PAYMENT,
      projectId: null,
      allocationId: null,
      debtAccountId: MORTGAGE_ID,
      entries,
      ledgerCodes: entryLedgerCodes(entries),
      ...audit(identity),
    });

    const openingBalance = balance;
    balance -= calculation.principal;
    closingByMonth[ym(2026, month)] = balance;
    emit(b, DebtSnapshotSchema, hh(identity, 'debtAccounts', MORTGAGE_ID, 'snapshots'), ym(2026, month), {
      id: ym(2026, month),
      yearMonth: ym(2026, month),
      openingBalance,
      principalPaid: calculation.principal,
      interestPaid: calculation.interest,
      totalPaid: MORTGAGE_PAYMENT,
      closingBalance: balance,
      ...audit(identity),
    });
  }

  // DebtAccount.currentBalance stays consistent with derived balance
  // (borrow principal minus seeded principal repayments) — ADR-0015.
  emit(b, DebtAccountSchema, hh(identity, 'debtAccounts'), MORTGAGE_ID, {
    id: MORTGAGE_ID,
    name: '玉山房貸',
    type: 'mortgage',
    repaymentType: 'equal_payment',
    originalAmount: MORTGAGE_PRINCIPAL,
    currentBalance: balance,
    interestRate: MORTGAGE_RATE,
    startDate: new Date(2026, 0, 5),
    endDate: new Date(2036, 0, 5),
    monthlyPayment: MORTGAGE_PAYMENT,
    linkedLedgerCode: LEDGER_CODES.LIABILITY_MORTGAGE,
    linkedProjectId: 'proj_housing',
    isActive: true,
    ...audit(identity),
  });

  return { mortgageBalance: balance, interestTotal, closingByMonth };
};

const buildSnapshotDocs = (b: Builder, txns: InternalTxn[]) => {
  const { identity } = b;
  const sorted = [...txns].sort((a, c) => a.date.getTime() - c.date.getTime());

  const cashThrough = (target: string) =>
    sorted.filter((t) => t.yearMonth <= target).reduce((sum, t) => sum + cashDelta(t.entries), 0);

  for (const target of Object.keys(SECURITIES_MARKET_VALUE)) {
    const [y, m] = target.split('-').map(Number);
    emit(b, AccountSnapshotSchema, hh(identity, 'accounts', 'acc_cash', 'snapshots'), target, {
      id: target,
      year: y,
      month: m,
      amount: cashThrough(target),
      ...audit(identity),
    });
    emit(b, AccountSnapshotSchema, hh(identity, 'accounts', 'acc_securities', 'snapshots'), target, {
      id: target,
      year: y,
      month: m,
      amount: SECURITIES_MARKET_VALUE[target],
      ...audit(identity),
    });
  }

  // Project settlement snapshots. ADR-0012: opening balances must chain from
  // the first month even though only REPORT_MONTHS snapshots are persisted.
  const allocations = b.docs
    .filter((d) => d.collectionPath.endsWith('/allocations'))
    .map((d) => d.data as unknown as { yearMonth: string; direction: 'INCOME' | 'EXPENSE'; items: AllocationItem[] });

  const projectIds = ['proj_daily', 'proj_housing', 'proj_leisure', 'proj_pet', 'proj_allowance', 'proj_legacy'];
  for (const projectId of projectIds) {
    let opening = 0;
    for (const { year, month } of monthRange(SALARY_START, SALARY_END)) {
      const target = ym(year, month);
      const snap = calculateProjectSettlementSnapshot({
        year,
        month,
        projectId,
        openingBalance: opening,
        allocations: allocations.filter((a) => a.yearMonth === target),
        transfers: sorted.filter((t) => t.yearMonth === target && (t.fromProjectId || t.toProjectId)),
        projectTransactions: sorted.filter((t) => t.yearMonth === target && t.projectId === projectId),
      });
      opening = snap.closingBalance;
      if (REPORT_MONTHS.includes(target)) {
        emit(b, ProjectSnapshotSchema, hh(identity, 'projects', projectId, 'snapshots'), target, {
          id: target,
          ...snap,
          ...audit(identity),
        });
      }
    }
  }
};

const buildPortfolioSnapshotDocs = (b: Builder) => {
  const { identity } = b;
  const months = ['2026-07', '2026-08', '2026-09'];
  let cumulativeGain = 0;
  let prevValue = SECURITIES_MARKET_VALUE['2026-06'];

  months.forEach((target) => {
    const [y, m] = target.split('-').map(Number);
    const closingValue = SECURITIES_MARKET_VALUE[target];
    const gain = closingValue - prevValue;
    cumulativeGain += gain;
    emit(b, PortfolioSnapshotSchema, hh(identity, 'portfolios', 'pf_core', 'snapshots'), target, {
      id: target,
      year: y,
      month: m,
      accounts: [
        {
          accountId: 'acc_securities',
          accountName: '券商帳戶',
          category: 'securities',
          value: closingValue,
          holdings: [
            { symbol: '0050', name: '元大台灣50', quantity: 400, cost: 50, marketValue: closingValue },
          ],
        },
      ],
      totalValue: closingValue,
      cashFlow: { deposits: 0, withdrawals: 0 },
      performance: {
        openingValue: prevValue,
        closingValue,
        netCashFlow: 0,
        gain,
        returnRate: Number(((gain / prevValue) * 100).toFixed(2)),
        cumulativeGain,
        cumulativeReturnRate: Number(((cumulativeGain / 20_000) * 100).toFixed(2)),
      },
      ...audit(identity),
    });
    prevValue = closingValue;
  });
};

const buildRetirementDocs = (b: Builder, mortgage: { closingByMonth: Record<string, number>; interestTotal: number }) => {
  const { identity } = b;
  const importedAt = QA_SEED_FIXED_NOW.toISOString();

  const incomes = [
    RetirementIncomeSourceSchema.parse({
      id: 'inc_salary',
      name: '薪資收入',
      importedFrom: 'transactionEntries',
      incomeCalculationMode: 'IMPORTED',
      incomeCategory: LEDGER_CODES.INCOME_SALARY,
      type: 'salary',
      startYear: 2026,
      endYear: 2030,
      baseAmount: SALARY_TOTAL_2025,
      growthRate: 2,
      autoUpdate: true,
      calculatedFrom: {
        ledgerCode: LEDGER_CODES.INCOME_SALARY,
        sampleYear: SAMPLE_YEAR,
        totalAmount: SALARY_TOTAL_2025,
        monthlyAverage: SALARY_AMOUNT,
        sampleCount: 12,
        importedAt,
      },
    }),
    RetirementIncomeSourceSchema.parse({
      id: 'inc_bonus',
      name: '年終獎金',
      importedFrom: 'transactionEntries',
      incomeCalculationMode: 'DERIVED',
      derivedFrom: { baseIncomeId: 'inc_salary', multiplier: 1.67 },
      type: 'bonus',
      startYear: 2026,
      endYear: 2030,
      baseAmount: Math.round(SALARY_TOTAL_2025 * 1.67),
      growthRate: 2,
    }),
    RetirementIncomeSourceSchema.parse({
      id: 'inc_pension',
      name: '勞保年金',
      importedFrom: 'manual',
      incomeCalculationMode: 'FIXED',
      type: 'pension',
      lifelong: true,
      startYear: 2030,
      baseAmount: 240_000,
      growthRate: 0,
    }),
  ];

  const expenses = [
    RetirementExpenseCategorySchema.parse({
      id: 'exp_living',
      name: '日常支出',
      type: 'general',
      calculationMode: 'FIXED',
      baseAmount: 480_000,
      growthRate: 2,
      retirementMultiplier: 0.7,
      startYear: 2026,
      endYear: null,
    }),
    RetirementExpenseCategorySchema.parse({
      id: 'exp_mortgage',
      name: '房貸還款',
      type: 'debt_payment',
      sourceDebtAccountId: MORTGAGE_ID,
      includesPrincipal: true,
      interestOnly: false,
      calculationMode: 'FIXED',
      baseAmount: MORTGAGE_PAYMENT * 12,
      growthRate: 0,
      retirementMultiplier: 0,
      startYear: 2026,
      endYear: 2036,
      calculatedFrom: {
        debtAccountId: MORTGAGE_ID,
        sampleStartYearMonth: '2026-02',
        sampleEndYearMonth: '2026-09',
        totalPaid: MORTGAGE_PAYMENT * 8,
        interestPaid: mortgage.interestTotal,
        sampleCount: 8,
        importedAt,
      },
    }),
  ];

  const plan = RetirementPlanSchema.parse({
    id: PLAN_ID,
    name: 'QA 退休計畫',
    isActive: true,
    autoUpdate: false,
    currentYear: 2026,
    birthYear: 1985,
    retirementAge: 45,
    lifeExpectancy: 85,
    currentSavings: 1_200_000,
    salaryGrowthRate: 2,
    inflationRate: 2,
    investmentReturnRate: 5,
    incomes,
    expenses,
    events: [
      {
        id: 'evt_renovation',
        type: 'expense',
        name: '房屋修繕',
        calculationMode: 'FIXED',
        phases: [
          { name: '一次修繕', startYear: 2028, endYear: 2028, mode: 'FIXED', amount: 800_000 },
        ],
      },
    ],
    ...audit(identity),
  });

  // The plan was already validated by RetirementPlanSchema.parse() above.
  // The stored plan doc omits the batch-replaceable child collections
  // (ADR-0026/0040); re-validate the stored shape against the same schema
  // so future field drift is caught at seed time, not at app read time.
  const planDoc: Record<string, unknown> = { ...plan };
  delete planDoc.incomes;
  delete planDoc.expenses;
  RetirementPlanSchema.parse({ ...planDoc, incomes: [], expenses: [] });
  emit(b, z.record(z.string(), z.unknown()), hh(identity, 'retirement_plans'), PLAN_ID, planDoc);

  // Income/expense subcollection docs: validate with audit fields included,
  // since the stored shape includes BaseSchema fields the standalone schemas
  // don't enforce. RetirementIncomeSourceSchema uses superRefine, so we
  // validate the audit fields separately (the income shape was already
  // validated by RetirementIncomeSourceSchema.parse() above).
  const withAudit = z.object(auditShape);

  for (const income of incomes) {
    const doc = { ...income, ...audit(identity) };
    withAudit.parse(doc);
    emit(b, z.record(z.string(), z.unknown()), hh(identity, 'retirement_plans', PLAN_ID, 'incomeStreams'), income.id, doc);
  }
  for (const expense of expenses) {
    const doc = { ...expense, ...audit(identity) };
    withAudit.parse(doc);
    emit(b, z.record(z.string(), z.unknown()), hh(identity, 'retirement_plans', PLAN_ID, 'expenseCategories'), expense.id, doc);
  }
};

const buildReportDocs = (b: Builder, txns: InternalTxn[], mortgageClosing: Record<string, number>) => {
  const { identity } = b;
  const sorted = [...txns].sort((a, c) => a.date.getTime() - c.date.getTime());

  const entriesThrough = (target: string): JournalEntryLine[] =>
    sorted.filter((t) => t.yearMonth <= target).flatMap((t) => t.entries);
  const entriesIn = (target: string): JournalEntryLine[] =>
    sorted.filter((t) => t.yearMonth === target).flatMap((t) => t.entries);
  const cashThrough = (target: string) =>
    sorted.filter((t) => t.yearMonth <= target).reduce((sum, t) => sum + cashDelta(t.entries), 0);

  const accounts = [
    { id: 'acc_cash', name: '現金帳戶', category: 'cash' },
    { id: 'acc_securities', name: '券商帳戶', category: 'securities' },
  ];
  const previousMonth = (target: string) => {
    const [y, m] = target.split('-').map(Number);
    return ym(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1);
  };

  let prevBalanceSheet: BalanceSheetData | null = null;
  for (const target of REPORT_MONTHS) {
    const incomeStatement = calculateIncomeStatement({ yearMonth: target, entries: entriesIn(target) });

    const balanceSheet = calculateBalanceSheet({
      yearMonth: target,
      entries: entriesThrough(target),
      monthlyEntries: entriesIn(target),
      accounts,
      portfolios: [{ id: 'pf_core', name: '核心投資組合' }],
      debtAccounts: [{ id: MORTGAGE_ID, name: '玉山房貸' }],
      accountSnapshots: [
        { accountId: 'acc_cash', amount: cashThrough(target) },
        { accountId: 'acc_securities', amount: SECURITIES_MARKET_VALUE[target] },
      ],
      debtSnapshots: [{ debtId: MORTGAGE_ID, closingBalance: mortgageClosing[target] ?? 0 }],
      portfolioSnapshots: [{ portfolioId: 'pf_core', gain: SECURITIES_MARKET_VALUE[target] - 20_000 }],
      prevBalanceSheet,
      incomeStatement,
    });
    prevBalanceSheet = balanceSheet;

    const cashFlow = calculateCashFlow({
      yearMonth: target,
      entries: entriesIn(target),
      beginningBalance: cashThrough(previousMonth(target)),
      actualBalance: cashThrough(target),
    });

    const reports = [
      { type: ReportType.INCOME_STATEMENT, data: incomeStatement },
      { type: ReportType.BALANCE_SHEET, data: balanceSheet },
      { type: ReportType.CASH_FLOW, data: cashFlow },
    ] as const;
    for (const report of reports) {
      const id = `${target}-${report.type}`;
      emit(b, FinancialReportSchema, hh(identity, 'reports'), id, {
        id,
        householdId: identity.householdId,
        yearMonth: target,
        type: report.type,
        data: report.data,
        ...audit(identity),
      });
    }
  }
};

export const buildQaSeedPlan = (identity: QaSeedIdentity): SeedDoc[] => {
  const b: Builder = { identity, docs: [] };
  const txns: InternalTxn[] = [];

  buildStaticDocs(b);
  buildSalaryDocs(b, txns);
  buildExpenseAndSpecialDocs(b, txns);
  const mortgage = buildMortgageDocs(b, txns);
  buildSnapshotDocs(b, txns);
  buildPortfolioSnapshotDocs(b);
  buildRetirementDocs(b, mortgage);
  buildReportDocs(b, txns, mortgage.closingByMonth);

  return b.docs;
};
