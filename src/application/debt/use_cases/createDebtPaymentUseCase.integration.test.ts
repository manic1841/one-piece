import { doc, getDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { operationRepository } from '@/infra/repositories/operationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { db, resetMockDb } from '@/test/mocks/firebase';

import { createDebtAccountUseCase } from './createDebtAccountUseCase';
import {
  type CreateDebtPaymentRequest,
  createDebtPaymentUseCase,
} from './createDebtPaymentUseCase';

const accountData = {
  name: '房貸 A',
  type: 'mortgage' as const,
  repaymentType: 'equal_payment' as const,
  originalAmount: 10000,
  currentBalance: 1,
  interestRate: 12,
  startDate: new Date('2026-01-01T00:00:00'),
  endDate: new Date('2030-01-01T00:00:00'),
  graceEndDate: null,
  monthlyPayment: 1200,
  linkedProjectId: null,
  isActive: true,
};

const createAccount = async (): Promise<string> =>
  createDebtAccountUseCase.execute({
    householdId: 'household-1',
    userEmail: 'user@example.com',
    auth: { uid: 'user-1', isGlobalAdmin: true },
    data: accountData,
  });

const paymentRequest = (
  debtAccountId: string,
  overrides: Partial<CreateDebtPaymentRequest> = {},
): CreateDebtPaymentRequest => ({
  householdId: 'household-1',
  userEmail: 'user@example.com',
  auth: { uid: 'user-1', isGlobalAdmin: true },
  debtAccountId,
  idempotencyKey: 'payment-1',
  totalPayment: 1200,
  date: new Date('2026-05-15T00:00:00'),
  ...overrides,
});

const accountRef = (debtAccountId: string) =>
  doc(db, 'households', 'household-1', 'debtAccounts', debtAccountId);

const snapshotRef = (debtAccountId: string, yearMonth: string) =>
  doc(db, 'households', 'household-1', 'debtAccounts', debtAccountId, 'snapshots', yearMonth);

const transactionRef = (transactionId: string) =>
  doc(db, 'households', 'household-1', 'transactions', transactionId);

describe('CreateDebtPaymentUseCase with Firestore Emulator', () => {
  beforeEach(async () => {
    await resetMockDb();
  });

  it('commits the transaction, snapshot, and balance together', async () => {
    const debtAccountId = await createAccount();

    const result = await createDebtPaymentUseCase.execute(paymentRequest(debtAccountId));
    const [accountSnapshot, debtSnapshot, transactionSnapshot] = await Promise.all([
      getDoc(accountRef(debtAccountId)),
      getDoc(snapshotRef(debtAccountId, '2026-05')),
      getDoc(transactionRef(result.transactionId)),
    ]);

    expect(result).toMatchObject({ principal: 1100, interest: 100, newBalance: 8900 });
    expect(accountSnapshot.data()).toMatchObject({ currentBalance: 8900 });
    expect(debtSnapshot.data()).toMatchObject({
      yearMonth: '2026-05',
      openingBalance: 10000,
      principalPaid: 1100,
      interestPaid: 100,
      totalPaid: 1200,
      closingBalance: 8900,
    });
    expect(transactionSnapshot.data()).toMatchObject({
      intentType: 'DEBT_PAYMENT',
      debtAccountId,
      amount: 1200,
      ledgerCodes: ['liability:mortgage', 'expense:interest', 'asset:cash'],
    });
  });

  it('cumulates multiple payments in the same month', async () => {
    const debtAccountId = await createAccount();

    await createDebtPaymentUseCase.execute(paymentRequest(debtAccountId));
    const secondResult = await createDebtPaymentUseCase.execute(
      paymentRequest(debtAccountId, { totalPayment: 1000, idempotencyKey: 'payment-2' }),
    );
    const debtSnapshot = await getDoc(snapshotRef(debtAccountId, '2026-05'));

    expect(secondResult).toMatchObject({ principal: 911, interest: 89, newBalance: 7989 });
    expect(debtSnapshot.data()).toMatchObject({
      openingBalance: 10000,
      principalPaid: 2011,
      interestPaid: 189,
      totalPaid: 2200,
      closingBalance: 7989,
    });
  });

  it('uses the prior month closing balance for a later-month payment', async () => {
    const debtAccountId = await createAccount();

    await createDebtPaymentUseCase.execute(paymentRequest(debtAccountId));
    await createDebtPaymentUseCase.execute(
      paymentRequest(debtAccountId, {
        date: new Date('2026-06-15T00:00:00'),
        idempotencyKey: 'payment-2',
        totalPayment: 1000,
      }),
    );
    const debtSnapshot = await getDoc(snapshotRef(debtAccountId, '2026-06'));

    expect(debtSnapshot.data()).toMatchObject({
      openingBalance: 8900,
      principalPaid: 911,
      interestPaid: 89,
      totalPaid: 1000,
      closingBalance: 7989,
    });
  });

  it('rolls back all writes when snapshot persistence fails', async () => {
    const debtAccountId = await createAccount();
    const snapshotFailure = vi
      .spyOn(debtSnapshotRepository, 'upsertSnapshot')
      .mockRejectedValueOnce(new Error('snapshot write failed'));

    await expect(createDebtPaymentUseCase.execute(paymentRequest(debtAccountId))).rejects.toThrow(
      'snapshot write failed',
    );

    const [accountSnapshot, payments, debtSnapshot] = await Promise.all([
      getDoc(accountRef(debtAccountId)),
      transactionRepository.listByDebtAccount('household-1', debtAccountId),
      getDoc(snapshotRef(debtAccountId, '2026-05')),
    ]);
    snapshotFailure.mockRestore();

    expect(accountSnapshot.data()).toMatchObject({ currentBalance: 10000 });
    expect(payments).toHaveLength(0);
    expect(debtSnapshot.exists()).toBe(false);
  });

  it('uses optimistic concurrency for concurrent payments', async () => {
    const debtAccountId = await createAccount();

    const results = await Promise.all([
      createDebtPaymentUseCase.execute(paymentRequest(debtAccountId)),
      createDebtPaymentUseCase.execute(
        paymentRequest(debtAccountId, { totalPayment: 1000, idempotencyKey: 'payment-2' }),
      ),
    ]);
    const [accountSnapshot, debtSnapshot, payments] = await Promise.all([
      getDoc(accountRef(debtAccountId)),
      getDoc(snapshotRef(debtAccountId, '2026-05')),
      transactionRepository.listByDebtAccount('household-1', debtAccountId),
    ]);

    expect(results).toHaveLength(2);
    // Interest accrues on the balance at commit time, so either commit order is valid.
    const initialBalance = accountData.originalAmount;
    const totalPrincipal = results.reduce((sum, { principal }) => sum + principal, 0);
    const totalInterest = results.reduce((sum, { interest }) => sum + interest, 0);
    const finalBalance = initialBalance - totalPrincipal;

    expect(Math.min(...results.map(({ newBalance }) => newBalance))).toBe(finalBalance);
    expect(accountSnapshot.data()).toMatchObject({ currentBalance: finalBalance });
    expect(debtSnapshot.data()).toMatchObject({
      openingBalance: initialBalance,
      principalPaid: totalPrincipal,
      interestPaid: totalInterest,
      totalPaid: 2200,
      closingBalance: finalBalance,
    });
    expect(payments).toHaveLength(2);
  });

  it('returns the original result when the same key and payload are replayed', async () => {
    const debtAccountId = await createAccount();
    const request = paymentRequest(debtAccountId, { idempotencyKey: 'replay-key' });

    const firstResult = await createDebtPaymentUseCase.execute(request);
    const replayResult = await createDebtPaymentUseCase.execute(request);
    const [payments, operation] = await Promise.all([
      transactionRepository.listByDebtAccount('household-1', debtAccountId),
      operationRepository.getByKey('household-1', 'DEBT_PAYMENT', 'replay-key'),
    ]);

    expect(replayResult).toEqual(firstResult);
    expect(payments).toHaveLength(1);
    expect(operation).toMatchObject({
      operationType: 'DEBT_PAYMENT',
      idempotencyKey: 'replay-key',
      fingerprintVersion: 1,
      status: 'SUCCEEDED',
      createdByUid: 'user-1',
      resultReference: expect.objectContaining({ transactionId: firstResult.transactionId }),
    });
  });

  it('rejects reuse of a key with a different payload without changing the original operation', async () => {
    const debtAccountId = await createAccount();
    const key = 'conflict-key';

    const firstResult = await createDebtPaymentUseCase.execute(
      paymentRequest(debtAccountId, { idempotencyKey: key }),
    );
    await expect(
      createDebtPaymentUseCase.execute(
        paymentRequest(debtAccountId, { idempotencyKey: key, totalPayment: 1000 }),
      ),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    const payments = await transactionRepository.listByDebtAccount('household-1', debtAccountId);

    expect(payments).toHaveLength(1);
    expect(payments[0]?.id).toBe(firstResult.transactionId);
  });

  it('keeps different idempotency keys independent for identical visible fields', async () => {
    const debtAccountId = await createAccount();

    await Promise.all([
      createDebtPaymentUseCase.execute(
        paymentRequest(debtAccountId, { idempotencyKey: 'independent-1' }),
      ),
      createDebtPaymentUseCase.execute(
        paymentRequest(debtAccountId, { idempotencyKey: 'independent-2' }),
      ),
    ]);
    const payments = await transactionRepository.listByDebtAccount('household-1', debtAccountId);

    expect(payments).toHaveLength(2);
  });

  it('does not leave an operation record after validation failure', async () => {
    const debtAccountId = await createAccount();
    const key = 'validation-failure-key';

    await expect(
      createDebtPaymentUseCase.execute(
        paymentRequest(debtAccountId, { idempotencyKey: key, totalPayment: 11100 }),
      ),
    ).rejects.toMatchObject({ code: 'PAYMENT_EXCEEDS_PRINCIPAL' });
    expect(await operationRepository.getByKey('household-1', 'DEBT_PAYMENT', key)).toBeNull();

    const result = await createDebtPaymentUseCase.execute(
      paymentRequest(debtAccountId, { idempotencyKey: key }),
    );
    expect(result.transactionId).toBeTruthy();
  });

  it('does not leave an operation record after an aborted transaction', async () => {
    const debtAccountId = await createAccount();
    const key = 'aborted-operation-key';
    const snapshotFailure = vi
      .spyOn(debtSnapshotRepository, 'upsertSnapshot')
      .mockRejectedValueOnce(new Error('snapshot write failed'));

    await expect(
      createDebtPaymentUseCase.execute(paymentRequest(debtAccountId, { idempotencyKey: key })),
    ).rejects.toThrow('snapshot write failed');
    snapshotFailure.mockRestore();

    expect(await operationRepository.getByKey('household-1', 'DEBT_PAYMENT', key)).toBeNull();
    await expect(
      createDebtPaymentUseCase.execute(paymentRequest(debtAccountId, { idempotencyKey: key })),
    ).resolves.toMatchObject({ principal: 1100, interest: 100 });
  });
});
