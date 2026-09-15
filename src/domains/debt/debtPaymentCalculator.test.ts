import { describe, expect, it } from 'vitest';

import {
  DebtPaymentError,
  assertEntriesBalanced,
  buildDebtPaymentEntries,
  calculateDebtPayment,
  isLoanActiveInMonth,
} from './debtPaymentCalculator';

const startDate = new Date('2026-01-01T00:00:00');
const graceEndDate = new Date('2026-04-01T00:00:00');

describe('calculateDebtPayment', () => {
  it('splits a normal payment into principal and interest', () => {
    const result = calculateDebtPayment({
      currentBalance: 10000,
      interestRate: 12,
      totalPayment: 1200,
      paymentDate: new Date('2026-05-15T00:00:00'),
      startDate,
      graceEndDate: null,
    });

    expect(result).toMatchObject({
      principal: 1100,
      interest: 100,
      inGracePeriod: false,
    });
    expect(result.warning).toBeUndefined();

    const entries = buildDebtPaymentEntries('liability:loan', result, 1200);
    expect(entries).toEqual([
      { ledgerCode: 'liability:loan', debit: 1100, credit: 0 },
      { ledgerCode: 'expense:interest', debit: 100, credit: 0 },
      { ledgerCode: 'asset:cash', debit: 0, credit: 1200 },
    ]);
    expect(() => assertEntriesBalanced(entries)).not.toThrow();
  });

  it('records a zero-interest payment as principal without a zero interest line', () => {
    const result = calculateDebtPayment({
      currentBalance: 10000,
      interestRate: 0,
      totalPayment: 1200,
      paymentDate: new Date('2026-05-15T00:00:00'),
      startDate,
      graceEndDate: null,
    });

    expect(result).toMatchObject({ principal: 1200, interest: 0 });
    expect(buildDebtPaymentEntries('liability:loan', result, 1200)).toEqual([
      { ledgerCode: 'liability:loan', debit: 1200, credit: 0 },
      { ledgerCode: 'asset:cash', debit: 0, credit: 1200 },
    ]);
  });

  it('allows a payment below interest with no principal and a warning', () => {
    const result = calculateDebtPayment({
      currentBalance: 10000,
      interestRate: 12,
      totalPayment: 50,
      paymentDate: new Date('2026-05-15T00:00:00'),
      startDate,
      graceEndDate: null,
    });

    expect(result).toMatchObject({ principal: 0, interest: 50 });
    expect(result.warning).toBeTruthy();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-positive or non-finite payment amount %s',
    (totalPayment) => {
      expect(() =>
        calculateDebtPayment({
          currentBalance: 10000,
          interestRate: 12,
          totalPayment,
          paymentDate: new Date('2026-05-15T00:00:00'),
          startDate,
          graceEndDate: null,
        }),
      ).toThrowError(DebtPaymentError);

      try {
        calculateDebtPayment({
          currentBalance: 10000,
          interestRate: 12,
          totalPayment,
          paymentDate: new Date('2026-05-15T00:00:00'),
          startDate,
          graceEndDate: null,
        });
      } catch (error) {
        expect(error).toMatchObject({ code: 'INVALID_PAYMENT' });
      }
    },
  );

  it('rejects a normal payment whose principal exceeds the remaining balance', () => {
    expect(() =>
      calculateDebtPayment({
        currentBalance: 1000,
        interestRate: 12,
        totalPayment: 1100,
        paymentDate: new Date('2026-05-15T00:00:00'),
        startDate,
        graceEndDate: null,
      }),
    ).toThrowError('PAYMENT_EXCEEDS_PRINCIPAL');
  });

  it('records interest only during the grace period', () => {
    const result = calculateDebtPayment({
      currentBalance: 10000,
      interestRate: 12,
      totalPayment: 100,
      paymentDate: new Date('2026-03-15T00:00:00'),
      startDate,
      graceEndDate,
    });

    expect(result).toMatchObject({ principal: 0, interest: 100, inGracePeriod: true });
    expect(buildDebtPaymentEntries('liability:loan', result, 100)).toEqual([
      { ledgerCode: 'expense:interest', debit: 100, credit: 0 },
      { ledgerCode: 'asset:cash', debit: 0, credit: 100 },
    ]);
  });

  it('treats the grace end date as the first normal repayment date', () => {
    const result = calculateDebtPayment({
      currentBalance: 10000,
      interestRate: 12,
      totalPayment: 1200,
      paymentDate: graceEndDate,
      startDate,
      graceEndDate,
    });

    expect(result).toMatchObject({ principal: 1100, interest: 100, inGracePeriod: false });
  });

  it('rejects a grace-period payment above applicable interest', () => {
    expect(() =>
      calculateDebtPayment({
        currentBalance: 10000,
        interestRate: 12,
        totalPayment: 101,
        paymentDate: new Date('2026-03-15T00:00:00'),
        startDate,
        graceEndDate,
      }),
    ).toThrowError('GRACE_PERIOD_PAYMENT_EXCEEDS_INTEREST');
  });
});

describe('isLoanActiveInMonth', () => {
  it('includes a month inside the loan period', () => {
    expect(
      isLoanActiveInMonth(new Date('2026-01-15'), new Date('2029-01-15'), new Date('2026-09-01')),
    ).toBe(true);
  });

  it('includes the month the loan starts', () => {
    expect(
      isLoanActiveInMonth(new Date('2026-09-20'), new Date('2029-01-15'), new Date('2026-09-01')),
    ).toBe(true);
  });

  it('includes the month the loan ends', () => {
    expect(
      isLoanActiveInMonth(new Date('2026-01-15'), new Date('2026-09-05'), new Date('2026-09-01')),
    ).toBe(true);
  });

  it('excludes a month before the loan starts', () => {
    expect(
      isLoanActiveInMonth(new Date('2026-10-01'), new Date('2029-01-15'), new Date('2026-09-01')),
    ).toBe(false);
  });

  it('excludes the month after the loan period ends', () => {
    expect(
      isLoanActiveInMonth(new Date('2026-01-15'), new Date('2026-08-31'), new Date('2026-09-01')),
    ).toBe(false);
  });
});
