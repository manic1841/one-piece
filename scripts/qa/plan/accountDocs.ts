/**
 * Account records: the mortgage (DebtAccount + monthly DebtSnapshots derived
 * through the debt payment calculator) and the monthly account snapshots.
 * Market values and the cash account chain stay consistent with the seeded
 * transactions (see docs/qa-seed-data.md §3).
 */
import { AccountSnapshotSchema } from '@/domains/account/types/account';
import {
  DebtAccountSchema,
  DebtSnapshotSchema,
} from '@/domains/debt/schemas';
import {
  buildDebtPaymentEntries,
  calculateDebtPayment,
} from '@/domains/debt/debtPaymentCalculator';
import { LEDGER_CODES } from '@/domains/ledger/constants';
import { TransactionSchema } from '@/domains/ledger/schemas';

import {
  audit,
  cashThrough,
  emit,
  entryLedgerCodes,
  hh,
  MORTGAGE_ID,
  MORTGAGE_PAYMENT,
  MORTGAGE_PRINCIPAL,
  MORTGAGE_RATE,
  marketValueAt,
  securitiesSnapshotMonths,
  ym,
  type Builder,
  type InternalTxn,
} from './shared';

export interface MortgageResult {
  mortgageBalance: number;
  interestTotal: number;
  closingByMonth: Record<string, number>;
}

export const buildMortgageDocs = (b: Builder, txns: InternalTxn[]): MortgageResult => {
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
      intentType: 'DEBT_PAYMENT',
      amount: MORTGAGE_PAYMENT,
      entries,
    });

    emit(b, TransactionSchema, hh(identity, 'transactions'), id, {
      id,
      date: paymentDate,
      description: `${ym(2026, month)} 房貸還款`,
      intentType: 'DEBT_PAYMENT',
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

export const buildAccountSnapshotDocs = (b: Builder, txns: InternalTxn[]) => {
  const { identity } = b;

  for (const target of securitiesSnapshotMonths()) {
    const [y, m] = target.split('-').map(Number);
    emit(b, AccountSnapshotSchema, hh(identity, 'accounts', 'acc_cash', 'snapshots'), target, {
      id: target,
      accountId: 'acc_cash',
      year: y,
      month: m,
      amount: cashThrough(txns, target),
      ...audit(identity),
    });
    emit(b, AccountSnapshotSchema, hh(identity, 'accounts', 'acc_securities', 'snapshots'), target, {
      id: target,
      accountId: 'acc_securities',
      year: y,
      month: m,
      amount: marketValueAt(target),
      ...audit(identity),
    });
  }
};
