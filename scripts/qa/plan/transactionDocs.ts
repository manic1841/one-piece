/**
 * Transaction journal: every seeded Transaction + Allocation doc, plus the
 * in-memory journal (InternalTxn[]) that snapshots, reports, and the
 * retirement import derive from. Cross-domain transactions (mortgage
 * drawdown, transfer, manual adjustment) live here so builders stay
 * independent (see docs/qa-seed-data.md §3).
 */
import { AllocationSchema, type AllocationItem } from '@/domains/allocation/schemas';
import { IntentType, LEDGER_CODES } from '@/domains/ledger/constants';
import {
  TransactionSchema,
  type JournalEntryLine,
} from '@/domains/ledger/schemas';

import {
  audit,
  emit,
  entryLedgerCodes,
  hh,
  monthRange,
  SEED_WINDOW_START,
  SEED_WINDOW_END,
  SALARY_AMOUNT,
  ym,
  type Builder,
  type InternalTxn,
} from './shared';

export const buildSalaryDocs = (b: Builder, txns: InternalTxn[]) => {
  const { identity } = b;
  for (const { year, month } of monthRange(SEED_WINDOW_START, SEED_WINDOW_END)) {
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

export const buildExpenseAndSpecialDocs = (b: Builder, txns: InternalTxn[]) => {
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
    8_000_000,
    '房貸撥款－購屋',
    [
      { ledgerCode: LEDGER_CODES.ASSET_PROPERTY, debit: 8_000_000, credit: 0 },
      { ledgerCode: LEDGER_CODES.LIABILITY_MORTGAGE, debit: 0, credit: 8_000_000 },
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
