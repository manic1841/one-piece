/**
 * Daily-expense stream specs: pure data consumed by
 * `transactionDocs.buildExpenseAndSpecialDocs` (see docs/qa-seed-data.md §3).
 */
import { LEDGER_CODES } from '@/domains/ledger/constants';

import { ACC_BANK_MAIN, ACC_CASH } from './shared';

export interface ExpenseSpec {
  ymKey: string;
  day: number;
  desc: string;
  project: string;
  ledger: string;
  amount: number;
  /** Which physical account the card/cash leg hits (issue #198 Q1). */
  account: string;
}

export const EXPENSE_SPECS: ExpenseSpec[] = [
  {
    ymKey: '2026-04',
    day: 8,
    desc: '超市採買',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_FOOD,
    amount: 1_800,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-04',
    day: 12,
    desc: '捷運儲值',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION,
    amount: 600,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-04',
    day: 20,
    desc: '飼料',
    project: 'proj_pet',
    ledger: 'expense:pets',
    amount: 1_200,
    account: ACC_CASH,
  },
  {
    ymKey: '2026-05',
    day: 8,
    desc: '超市採買',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_FOOD,
    amount: 1_800,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-05',
    day: 12,
    desc: '捷運儲值',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION,
    amount: 600,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-05',
    day: 18,
    desc: '電影票',
    project: 'proj_leisure',
    ledger: LEDGER_CODES.EXPENSE_ENTERTAINMENT,
    amount: 900,
    account: ACC_CASH,
  },
  {
    ymKey: '2026-06',
    day: 8,
    desc: '超市採買',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_FOOD,
    amount: 1_800,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-06',
    day: 12,
    desc: '捷運儲值',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION,
    amount: 600,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-06',
    day: 22,
    desc: '獸醫門診',
    project: 'proj_pet',
    ledger: 'expense:pets',
    amount: 3_500,
    account: ACC_CASH,
  },
  {
    ymKey: '2026-07',
    day: 8,
    desc: '超市採買',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_FOOD,
    amount: 1_800,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-07',
    day: 12,
    desc: '捷運儲值',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION,
    amount: 600,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-07',
    day: 26,
    desc: '演唱會',
    project: 'proj_leisure',
    ledger: LEDGER_CODES.EXPENSE_ENTERTAINMENT,
    amount: 2_400,
    account: ACC_CASH,
  },
  {
    ymKey: '2026-08',
    day: 8,
    desc: '超市採買',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_FOOD,
    amount: 1_800,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-08',
    day: 12,
    desc: '捷運儲值',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION,
    amount: 600,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-08',
    day: 15,
    desc: '零用錢支出',
    project: 'proj_allowance',
    ledger: LEDGER_CODES.EXPENSE_OTHER,
    amount: 3_000,
    account: ACC_CASH,
  },
  {
    ymKey: '2026-09',
    day: 8,
    desc: '超市採買',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_FOOD,
    amount: 1_800,
    account: ACC_BANK_MAIN,
  },
  {
    ymKey: '2026-09',
    day: 12,
    desc: '捷運儲值',
    project: 'proj_daily',
    ledger: LEDGER_CODES.EXPENSE_TRANSPORTATION,
    amount: 600,
    account: ACC_BANK_MAIN,
  },
];
