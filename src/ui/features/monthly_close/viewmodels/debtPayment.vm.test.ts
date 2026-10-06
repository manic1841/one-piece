import { describe, expect, it } from 'vitest';

import { buildDebtPaymentSections, buildDebtPaymentTotal } from './debtPayment.vm';

const meta = {
  debtAccountId: 'debt-1',
  debtAccountName: '房貸 A',
  interestRate: 12,
  openingBalance: 10_000,
  monthlyDue: 100,
};

describe('debtPayment.vm', () => {
  it('derives the split as the total payment is typed', () => {
    const [section] = buildDebtPaymentSections({
      debtAccounts: [meta],
      repayments: [{ debtAccountId: 'debt-1', totalPayment: 1_200 }],
    });

    expect(section.principal).toBe(1_100);
    expect(section.principalText).toBe('NT$1,100');
    expect(section.interest).toBe(100);
    expect(section.interestText).toBe('NT$100');
    expect(section.closingBalance).toBe(8_900);
    expect(section.closingBalanceText).toBe('NT$8,900');
    expect(section.interestRateText).toBe('12%');
    expect(section.openingBalanceText).toBe('NT$10,000');
    expect(section.monthlyDueText).toBe('NT$100');
    expect(section.warning).toBeNull();
    expect(section.blockedReason).toBeNull();
  });

  it('blocks a payment whose principal would exceed the opening balance', () => {
    const [section] = buildDebtPaymentSections({
      debtAccounts: [meta],
      repayments: [{ debtAccountId: 'debt-1', totalPayment: 20_000 }],
    });

    expect(section.blockedReason).toContain('PAYMENT_EXCEEDS_PRINCIPAL');
    expect(section.principal).toBe(0);
    expect(section.interest).toBe(0);
    expect(section.closingBalance).toBe(10_000);
    expect(section.warning).toBeNull();
  });

  it('warns when the total does not cover the month interest', () => {
    const [section] = buildDebtPaymentSections({
      debtAccounts: [meta],
      repayments: [{ debtAccountId: 'debt-1', totalPayment: 50 }],
    });

    expect(section.principal).toBe(0);
    expect(section.interest).toBe(50);
    expect(section.closingBalance).toBe(10_000);
    expect(section.warning).toBeTruthy();
    expect(section.blockedReason).toBeNull();
  });

  it('clears the derived values for a zero row', () => {
    const [section] = buildDebtPaymentSections({
      debtAccounts: [meta],
      repayments: [{ debtAccountId: 'debt-1', totalPayment: 0 }],
    });

    expect(section.totalPayment).toBe(0);
    expect(section.monthlyDue).toBe(100);
    expect(section.principal).toBe(0);
    expect(section.interest).toBe(0);
    expect(section.closingBalance).toBe(10_000);
    expect(section.warning).toBeNull();
    expect(section.blockedReason).toBeNull();
  });

  it('totals the sections', () => {
    const sections = buildDebtPaymentSections({
      debtAccounts: [
        meta,
        {
          debtAccountId: 'debt-2',
          debtAccountName: '車貸',
          interestRate: 0,
          openingBalance: 5_000,
        },
      ],
      repayments: [
        { debtAccountId: 'debt-1', totalPayment: 1_200 },
        { debtAccountId: 'debt-2', totalPayment: 1_000 },
      ],
    });

    expect(buildDebtPaymentTotal(sections)).toEqual({
      principal: 2_100,
      interest: 100,
      total: 2_200,
      principalText: 'NT$2,100',
      interestText: 'NT$100',
      totalText: 'NT$2,200',
    });
  });

  it('keeps the prefilled due with its section as the total is typed', () => {
    const [section] = buildDebtPaymentSections({
      debtAccounts: [{ ...meta, monthlyDue: 100 }],
      repayments: [{ debtAccountId: 'debt-1', totalPayment: 1_200 }],
    });

    expect(section.monthlyDue).toBe(100);
    expect(section.principal).toBe(1_100);
  });

  it('treats missing rows as zero', () => {
    const [section] = buildDebtPaymentSections({
      debtAccounts: [meta],
      repayments: [],
    });

    expect(section.totalPayment).toBe(0);
    expect(section.closingBalance).toBe(10_000);
  });
});
