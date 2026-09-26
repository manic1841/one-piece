/**
 * Transaction journal: every seeded Transaction + Allocation doc, plus the
 * in-memory journal (InternalTxn[]) that snapshots, reports, and the
 * retirement import derive from. Cross-domain transactions (mortgage
 * drawdown, transfer, manual adjustment) live here so builders stay
 * independent (see docs/qa-seed-data.md §3).
 */
import { type AllocationItem, AllocationSchema } from '@/domains/allocation/schemas';
import { IntentType, LEDGER_CODES } from '@/domains/ledger/constants';
import { type JournalEntryLine, TransactionSchema } from '@/domains/ledger/schemas';

import { EXPENSE_SPECS } from './expenseSpecs';
import {
  ACC_BANK_FOREIGN,
  ACC_BANK_MAIN,
  ACC_BANK_SAVINGS,
  ACC_CASH,
  type Builder,
  CAR_LOAN_ID,
  CAR_LOAN_PRINCIPAL,
  CAR_PURCHASE_AMOUNT,
  type InternalTxn,
  SALARY_AMOUNT,
  SEED_WINDOW_END,
  SEED_WINDOW_START,
  audit,
  emit,
  entryLedgerCodes,
  hh,
  monthRange,
  usdTwdAmount,
  ym,
} from './shared';

export const buildSalaryDocs = (b: Builder, txns: InternalTxn[]) => {
  const { identity } = b;
  for (const { year, month } of monthRange(SEED_WINDOW_START, SEED_WINDOW_END)) {
    const id = `txn_salary_${ym(year, month)}`;
    const date = new Date(year, month - 1, 5);
    const entries: JournalEntryLine[] = [
      {
        ledgerCode: LEDGER_CODES.ASSET_CASH,
        accountId: ACC_BANK_MAIN,
        debit: SALARY_AMOUNT,
        credit: 0,
      },
      { ledgerCode: LEDGER_CODES.INCOME_SALARY, debit: 0, credit: SALARY_AMOUNT },
    ];
    txns.push({
      id,
      yearMonth: ym(year, month),
      date,
      intentType: IntentType.INCOME,
      amount: SALARY_AMOUNT,
      entries,
    });

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
      { projectId: 'proj_daily', percentage: 50, amount: 30_000 },
      { projectId: 'proj_housing', percentage: 25, amount: 15_000 },
      { projectId: 'proj_leisure', percentage: 10, amount: 6_000 },
      { projectId: 'proj_travel', percentage: 8, amount: 4_800 },
      { projectId: 'proj_education', percentage: 7, amount: 4_200 },
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

export const buildExpenseAndSpecialDocs = (b: Builder, txns: InternalTxn[]) => {
  const { identity } = b;

  const addTxn = (
    id: string,
    date: Date,
    intentType: string,
    amount: number,
    description: string,
    entries: JournalEntryLine[],
    extra: {
      projectId?: string;
      fromProjectId?: string;
      toProjectId?: string;
      debtAccountId?: string;
    } = {},
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

  // Securities purchases funded from the Taishin payroll account: the 0050
  // add-on in March plus the leveraged/new positions in May and June.
  addTxn('txn_invest_2026_03', new Date(2026, 2, 15), IntentType.INVESTMENT, 20_000, '買進 0050', [
    { ledgerCode: LEDGER_CODES.ASSET_INVESTMENT, debit: 20_000, credit: 0 },
    { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: ACC_BANK_MAIN, debit: 0, credit: 20_000 },
  ]);

  addTxn(
    'txn_invest_2026_05',
    new Date(2026, 4, 8),
    IntentType.INVESTMENT,
    8_000,
    '買進 00675L（2x 槓桿）',
    [
      { ledgerCode: LEDGER_CODES.ASSET_INVESTMENT, debit: 8_000, credit: 0 },
      { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: ACC_BANK_MAIN, debit: 0, credit: 8_000 },
    ],
  );

  addTxn('txn_invest_2026_06', new Date(2026, 5, 15), IntentType.INVESTMENT, 10_000, '買進 00878', [
    { ledgerCode: LEDGER_CODES.ASSET_INVESTMENT, debit: 10_000, credit: 0 },
    { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: ACC_BANK_MAIN, debit: 0, credit: 10_000 },
  ]);

  // Car loan drawdown: cash vs loan liability (same shape as the mortgage borrow).
  addTxn(
    'txn_borrow_car',
    new Date(2026, 3, 10),
    IntentType.FINANCING,
    CAR_LOAN_PRINCIPAL,
    '車貸撥款－購車',
    [
      {
        ledgerCode: LEDGER_CODES.ASSET_CASH,
        accountId: ACC_BANK_MAIN,
        debit: CAR_LOAN_PRINCIPAL,
        credit: 0,
      },
      { ledgerCode: LEDGER_CODES.LIABILITY_LOAN, debit: 0, credit: CAR_LOAN_PRINCIPAL },
    ],
    { debtAccountId: CAR_LOAN_ID },
  );

  // Vehicle purchase: the drawn-down cash buys the car (family expense).
  addTxn(
    'txn_purchase_car',
    new Date(2026, 3, 15),
    IntentType.EXPENSE,
    CAR_PURCHASE_AMOUNT,
    '購車',
    [
      { ledgerCode: LEDGER_CODES.EXPENSE_VEHICLE, debit: CAR_PURCHASE_AMOUNT, credit: 0 },
      {
        ledgerCode: LEDGER_CODES.ASSET_CASH,
        accountId: ACC_BANK_MAIN,
        debit: 0,
        credit: CAR_PURCHASE_AMOUNT,
      },
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
      { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: ACC_CASH, debit: 5_000, credit: 0 },
      { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: ACC_CASH, debit: 0, credit: 5_000 },
    ],
    { fromProjectId: 'proj_leisure', toProjectId: 'proj_daily' },
  );

  // Manual journal entry: cash count adjustment.
  addTxn('txn_manual_2026_05', new Date(2026, 4, 20), IntentType.MANUAL, 200, '現金盤點調整', [
    { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: ACC_CASH, debit: 200, credit: 0 },
    { ledgerCode: LEDGER_CODES.INCOME_REFUND, debit: 0, credit: 200 },
  ]);

  // 2026 money-flow story (issue #198 Q1/Q8): salary lands in the Taishin
  // payroll account, daily expenses split between card and cash, and no money
  // ever moves between the household's own accounts. Savings (YuShan digital)
  // and the foreign-currency account only receive external events.

  // Lunar New Year red envelopes: the cash account's opening funding.
  addTxn('txn_redenvelope_2026_02', new Date(2026, 1, 12), IntentType.INCOME, 30_000, '過年紅包', [
    { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: ACC_CASH, debit: 30_000, credit: 0 },
    { ledgerCode: LEDGER_CODES.INCOME_OTHER, debit: 0, credit: 30_000 },
  ]);

  // Year-end bonus: parked in the YuShan digital account, never touched.
  addTxn('txn_bonus_2026_01', new Date(2026, 0, 20), IntentType.INCOME, 120_000, '年終獎金', [
    { ledgerCode: LEDGER_CODES.ASSET_CASH, accountId: ACC_BANK_SAVINGS, debit: 120_000, credit: 0 },
    { ledgerCode: LEDGER_CODES.INCOME_BONUS, debit: 0, credit: 120_000 },
  ]);

  // Overseas friends & family remittance: the foreign account's only event,
  // landed in January so every snapshot freezes the same rate (issue #198 Q3/Q8).
  addTxn(
    'txn_fx_in_2026_01',
    new Date(2026, 0, 6),
    IntentType.INCOME,
    usdTwdAmount(),
    '海外親友匯款 USD 1,800 @ 31.2',
    [
      {
        ledgerCode: LEDGER_CODES.ASSET_CASH,
        accountId: ACC_BANK_FOREIGN,
        debit: usdTwdAmount(),
        credit: 0,
      },
      { ledgerCode: LEDGER_CODES.INCOME_OTHER, debit: 0, credit: usdTwdAmount() },
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
        {
          ledgerCode: LEDGER_CODES.ASSET_CASH,
          accountId: spec.account,
          debit: 0,
          credit: spec.amount,
        },
      ],
      { projectId: spec.project },
    );
  });
};
