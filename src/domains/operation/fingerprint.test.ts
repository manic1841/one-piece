import { describe, expect, it } from 'vitest';

import {
  DEBT_PAYMENT_FINGERPRINT_VERSION,
  DEBT_PAYMENT_OPERATION_TYPE,
  TRANSACTION_WITH_ALLOCATION_FINGERPRINT_VERSION,
  TRANSACTION_WITH_ALLOCATION_OPERATION_TYPE,
  createDebtPaymentFingerprint,
  createTransactionWithAllocationFingerprint,
} from './fingerprint';

const baseInput = {
  operationType: DEBT_PAYMENT_OPERATION_TYPE,
  fingerprintVersion: DEBT_PAYMENT_FINGERPRINT_VERSION,
  debtAccountId: 'debt-1',
  totalPayment: 1200,
  paymentDate: new Date(2026, 4, 15, 8),
  description: '  May   payment  ',
  explicitProjectId: undefined,
} as const;

describe('createDebtPaymentFingerprint', () => {
  it('normalizes description and payment time within the same calendar date', async () => {
    const first = await createDebtPaymentFingerprint(baseInput);
    const second = await createDebtPaymentFingerprint({
      ...baseInput,
      paymentDate: new Date(2026, 4, 15, 23, 59),
      description: 'May payment',
    });

    expect(second).toBe(first);
  });

  it('does not include an omitted debt-account project fallback', async () => {
    const withoutProject = await createDebtPaymentFingerprint(baseInput);
    const explicitNull = await createDebtPaymentFingerprint({
      ...baseInput,
      explicitProjectId: null,
    });

    expect(explicitNull).toBe(withoutProject);
  });

  it('changes when an operation-affecting input changes', async () => {
    const base = await createDebtPaymentFingerprint(baseInput);
    const changed = await Promise.all([
      createDebtPaymentFingerprint({ ...baseInput, debtAccountId: 'debt-2' }),
      createDebtPaymentFingerprint({ ...baseInput, totalPayment: 1300 }),
      createDebtPaymentFingerprint({ ...baseInput, paymentDate: new Date(2026, 4, 16) }),
      createDebtPaymentFingerprint({ ...baseInput, explicitProjectId: 'project-1' }),
    ]);

    expect(changed.every((fingerprint) => fingerprint !== base)).toBe(true);
  });
});

const transactionWithAllocationInput = {
  transaction: {
    date: new Date(2026, 8, 2, 8),
    description: '  September   salary  ',
    intent: 'SALARY',
    intentType: 'INCOME',
    amount: 10000,
    projectId: null,
    entries: [
      { ledgerCode: 'asset:cash', debit: 10000, credit: 0 },
      { ledgerCode: 'income:salary:charles', debit: 0, credit: 10000 },
    ],
  },
  allocation: {
    direction: 'INCOME' as const,
    items: [{ projectId: 'project-1', percentage: 100 }],
  },
} as const;

describe('createTransactionWithAllocationFingerprint', () => {
  it('normalizes description and time within the same calendar date', async () => {
    const first = await createTransactionWithAllocationFingerprint(
      transactionWithAllocationInput,
    );
    const second = await createTransactionWithAllocationFingerprint({
      ...transactionWithAllocationInput,
      transaction: {
        ...transactionWithAllocationInput.transaction,
        date: new Date(2026, 8, 2, 23, 59),
        description: 'September salary',
      },
    });

    expect(second).toBe(first);
  });

  it('changes when an operation-affecting transaction or allocation input changes', async () => {
    const base = await createTransactionWithAllocationFingerprint(
      transactionWithAllocationInput,
    );
    const changed = await Promise.all([
      createTransactionWithAllocationFingerprint({
        ...transactionWithAllocationInput,
        transaction: { ...transactionWithAllocationInput.transaction, amount: 11000 },
      }),
      createTransactionWithAllocationFingerprint({
        ...transactionWithAllocationInput,
        transaction: { ...transactionWithAllocationInput.transaction, projectId: 'project-1' },
      }),
      createTransactionWithAllocationFingerprint({
        ...transactionWithAllocationInput,
        allocation: {
          direction: 'INCOME',
          items: [{ projectId: 'project-2', percentage: 100 }],
        },
      }),
    ]);

    expect(changed.every((fingerprint) => fingerprint !== base)).toBe(true);
  });

  it('uses the versioned operation identity', () => {
    expect(TRANSACTION_WITH_ALLOCATION_OPERATION_TYPE).toBe('TRANSACTION_WITH_ALLOCATION');
    expect(TRANSACTION_WITH_ALLOCATION_FINGERPRINT_VERSION).toBe(1);
  });
});