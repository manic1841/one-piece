import { describe, expect, it } from 'vitest';

import {
  DEBT_PAYMENT_FINGERPRINT_VERSION,
  DEBT_PAYMENT_OPERATION_TYPE,
  createDebtPaymentFingerprint,
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