/**
 * Account records: the mortgage and car loan (DebtAccounts + monthly
 * DebtSnapshots derived through the debt payment calculator) and the monthly
 * per-account snapshots. Market values and the per-account cash chains stay
 * consistent with the seeded transactions (see docs/qa-seed-data.md §3).
 */
import { AccountSnapshotSchema } from '@/domains/account/types/account';
import {
  buildDebtPaymentEntries,
  calculateDebtPayment,
} from '@/domains/debt/debtPaymentCalculator';
import { DebtAccountSchema, DebtSnapshotSchema } from '@/domains/debt/schemas';
import { LEDGER_CODES } from '@/domains/ledger/constants';
import { TransactionSchema } from '@/domains/ledger/schemas';

import {
  ACC_BANK_MAIN,
  type Builder,
  CAR_LOAN_ID,
  CAR_LOAN_PAYMENT,
  CAR_LOAN_PRINCIPAL,
  CAR_LOAN_RATE,
  type InternalTxn,
  MORTGAGE_ID,
  MORTGAGE_PAYMENT,
  MORTGAGE_PRINCIPAL,
  MORTGAGE_RATE,
  USD_EXCHANGE_RATE,
  USD_REMITTANCE_AMOUNT,
  audit,
  cashThroughFor,
  emit,
  entryLedgerCodes,
  hh,
  holdingsAt,
  marketValueAt,
  securitiesSnapshotMonths,
  ym,
} from './shared';

export interface MortgageResult {
  mortgageBalance: number;
  interestTotal: number;
  closingByMonth: Record<string, number>;
}

export interface CarLoanResult {
  carBalance: number;
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
    // Domain entries leave the cash leg untagged; the seeded repayment
    // auto-debits the Taishin payroll account (issue #198 Q1).
    const entries = buildDebtPaymentEntries(
      LEDGER_CODES.LIABILITY_MORTGAGE,
      calculation,
      MORTGAGE_PAYMENT,
    ).map((e) =>
      e.ledgerCode === LEDGER_CODES.ASSET_CASH ? { ...e, accountId: ACC_BANK_MAIN } : e,
    );
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
    emit(
      b,
      DebtSnapshotSchema,
      hh(identity, 'debtAccounts', MORTGAGE_ID, 'snapshots'),
      ym(2026, month),
      {
        id: ym(2026, month),
        yearMonth: ym(2026, month),
        openingBalance,
        principalPaid: calculation.principal,
        interestPaid: calculation.interest,
        totalPaid: MORTGAGE_PAYMENT,
        closingBalance: balance,
        ...audit(identity),
      },
    );
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

// Car loan (issue #198 Q6): drawdown + vehicle purchase in April
// (transactionDocs), then monthly payments from May through the
// calculateDebtPayment pipeline. April's income statement goes negative —
// the 450,000 vehicle purchase is the actual event, not a defect.
export const buildCarLoanDocs = (b: Builder, txns: InternalTxn[]): CarLoanResult => {
  const { identity } = b;
  let balance = CAR_LOAN_PRINCIPAL;
  const closingByMonth: Record<string, number> = {};

  for (let month = 5; month <= 9; month += 1) {
    const paymentDate = new Date(2026, month - 1, 5);
    const calculation = calculateDebtPayment({
      currentBalance: balance,
      interestRate: CAR_LOAN_RATE,
      totalPayment: CAR_LOAN_PAYMENT,
      paymentDate,
      startDate: new Date(2026, 3, 10),
      graceEndDate: null,
    });
    const entries = buildDebtPaymentEntries(
      LEDGER_CODES.LIABILITY_LOAN,
      calculation,
      CAR_LOAN_PAYMENT,
    ).map((e) =>
      e.ledgerCode === LEDGER_CODES.ASSET_CASH ? { ...e, accountId: ACC_BANK_MAIN } : e,
    );
    const id = `txn_cardebtpay_${ym(2026, month)}`;
    txns.push({
      id,
      yearMonth: ym(2026, month),
      date: paymentDate,
      intentType: 'DEBT_PAYMENT',
      amount: CAR_LOAN_PAYMENT,
      entries,
    });

    emit(b, TransactionSchema, hh(identity, 'transactions'), id, {
      id,
      date: paymentDate,
      description: `${ym(2026, month)} 車貸還款`,
      intentType: 'DEBT_PAYMENT',
      amount: CAR_LOAN_PAYMENT,
      projectId: null,
      allocationId: null,
      debtAccountId: CAR_LOAN_ID,
      entries,
      ledgerCodes: entryLedgerCodes(entries),
      ...audit(identity),
    });

    const openingBalance = balance;
    balance -= calculation.principal;
    closingByMonth[ym(2026, month)] = balance;
    emit(
      b,
      DebtSnapshotSchema,
      hh(identity, 'debtAccounts', CAR_LOAN_ID, 'snapshots'),
      ym(2026, month),
      {
        id: ym(2026, month),
        yearMonth: ym(2026, month),
        openingBalance,
        principalPaid: calculation.principal,
        interestPaid: calculation.interest,
        totalPaid: CAR_LOAN_PAYMENT,
        closingBalance: balance,
        ...audit(identity),
      },
    );
  }

  emit(b, DebtAccountSchema, hh(identity, 'debtAccounts'), CAR_LOAN_ID, {
    id: CAR_LOAN_ID,
    name: '車貸',
    type: 'loan',
    repaymentType: 'equal_payment',
    originalAmount: CAR_LOAN_PRINCIPAL,
    currentBalance: balance,
    interestRate: CAR_LOAN_RATE,
    startDate: new Date(2026, 3, 10),
    endDate: new Date(2031, 3, 10),
    monthlyPayment: CAR_LOAN_PAYMENT,
    linkedLedgerCode: LEDGER_CODES.LIABILITY_LOAN,
    isActive: true,
    ...audit(identity),
  });

  return { carBalance: balance, closingByMonth };
};

export const buildAccountSnapshotDocs = (b: Builder, txns: InternalTxn[]) => {
  const { identity } = b;

  // Per-account cash snapshots (issue #198 Q1/Q2): each account's chain
  // derives from its own asset:cash entries, so every account stays
  // reconciled with the transaction journal.
  const cashAccountChains: { accountId: string; amountAt: (target: string) => number }[] = [
    { accountId: 'acc_cash', amountAt: (target) => cashThroughFor(txns, 'acc_cash', target) },
    {
      accountId: 'acc_bank_main',
      amountAt: (target) => cashThroughFor(txns, 'acc_bank_main', target),
    },
    {
      accountId: 'acc_bank_savings',
      amountAt: (target) => cashThroughFor(txns, 'acc_bank_savings', target),
    },
    {
      accountId: 'acc_bank_foreign',
      amountAt: (target) => cashThroughFor(txns, 'acc_bank_foreign', target),
    },
  ];

  for (const target of securitiesSnapshotMonths()) {
    const [y, m] = target.split('-').map(Number);
    for (const chain of cashAccountChains) {
      emit(
        b,
        AccountSnapshotSchema,
        hh(identity, 'accounts', chain.accountId, 'snapshots'),
        target,
        {
          id: target,
          accountId: chain.accountId,
          year: y,
          month: m,
          amount: chain.amountAt(target),
          // The foreign account freezes the remittance rate into the
          // snapshot (issue #198 Q3): amount = originalAmount × exchangeRate.
          ...(chain.accountId === 'acc_bank_foreign'
            ? { originalAmount: USD_REMITTANCE_AMOUNT, exchangeRate: USD_EXCHANGE_RATE }
            : {}),
          ...audit(identity),
        },
      );
    }
    emit(
      b,
      AccountSnapshotSchema,
      hh(identity, 'accounts', 'acc_securities', 'snapshots'),
      target,
      {
        id: target,
        accountId: 'acc_securities',
        year: y,
        month: m,
        amount: marketValueAt(target),
        holdings: holdingsAt(target),
        ...audit(identity),
      },
    );
  }
};
