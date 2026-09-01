import { runTransaction } from 'firebase/firestore';

import {
  DebtPaymentCommandError,
  DebtPaymentCommandErrorCode,
} from '@/application/debt/errors';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import {
  assertEntriesBalanced,
  buildDebtPaymentEntries,
  calculateDebtPayment,
} from '@/domains/debt/debtPaymentCalculator';
import {
  createDebtPaymentFingerprint,
  DEBT_PAYMENT_FINGERPRINT_VERSION,
  DEBT_PAYMENT_OPERATION_TYPE,
} from '@/domains/operation/fingerprint';
import { type OperationResultReference } from '@/domains/operation/schemas';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { db } from '@/firebase';
import { operationRepository } from '@/infra/repositories/operationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface CreateDebtPaymentRequest {
  householdId: string;
  userEmail: string;
  auth: AuthContext;
  debtAccountId: string;
  idempotencyKey: string;
  totalPayment: number; // user-confirmed total repayment amount
  date: Date;
  description?: string;
  projectId?: string | null;
}

export interface CreateDebtPaymentResult {
  transactionId: string;
  principal: number;
  interest: number;
  newBalance: number;
}

/**
 * Orchestrates a DEBT_PAYMENT operation atomically:
 *  1. Fetch DebtAccount for balance & linkedLedgerCode
 *  2. Calculate principal/interest split
 *  3. Build & validate journal entries
 *  4. Commit Transaction, DebtSnapshot, and DebtAccount.currentBalance together
 */
export class CreateDebtPaymentUseCase {
  async execute(request: CreateDebtPaymentRequest): Promise<CreateDebtPaymentResult> {
    const {
      householdId,
      userEmail,
      auth,
      debtAccountId,
      idempotencyKey,
      totalPayment,
      date,
      description,
      projectId,
    } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    if (typeof idempotencyKey !== 'string' || idempotencyKey.trim().length === 0) {
      throw new DebtPaymentCommandError(
        DebtPaymentCommandErrorCode.INVALID_IDEMPOTENCY_KEY,
        'idempotency key must be a non-empty caller-generated value',
      );
    }

    const payloadFingerprint = await createDebtPaymentFingerprint({
      operationType: DEBT_PAYMENT_OPERATION_TYPE,
      fingerprintVersion: DEBT_PAYMENT_FINGERPRINT_VERSION,
      debtAccountId,
      totalPayment,
      paymentDate: date,
      description,
      explicitProjectId: projectId,
    });

    return runTransaction(db, async (tx) => {
      const existingOperation = await operationRepository.getByKey(
        householdId,
        DEBT_PAYMENT_OPERATION_TYPE,
        idempotencyKey,
        tx,
      );
      if (existingOperation) {
        if (existingOperation.payloadFingerprint !== payloadFingerprint) {
          throw new DebtPaymentCommandError(
            DebtPaymentCommandErrorCode.IDEMPOTENCY_CONFLICT,
            'idempotency key is already associated with a different payment payload',
          );
        }
        if (existingOperation.status === 'SUCCEEDED') {
          return readDebtPaymentResult(existingOperation.resultReference);
        }
        throw new DebtPaymentCommandError(
          DebtPaymentCommandErrorCode.OPERATION_IN_PROGRESS,
          'the idempotent payment operation is not complete',
        );
      }

      const account = await debtAccountRepository.get([householdId, debtAccountId], tx);
      if (!account) throw new Error(`DebtAccount ${debtAccountId} not found`);
      if (!account.isActive) throw new Error('Cannot record payment on an inactive debt account');

      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const currentSnapshot = await debtSnapshotRepository.getSnapshot(
        householdId,
        debtAccountId,
        yearMonth,
        tx,
      );
      const previousSnapshot = currentSnapshot
        ? null
        : await debtSnapshotRepository.getSnapshot(
            householdId,
            debtAccountId,
            getPrevYearMonth(yearMonth),
            tx,
          );

      const calculation = calculateDebtPayment({
        currentBalance: account.currentBalance,
        interestRate: account.interestRate,
        totalPayment,
        paymentDate: date,
        startDate: account.startDate,
        graceEndDate: account.graceEndDate,
      });

      if (calculation.warning) {
        console.warn('[CreateDebtPaymentUseCase]', calculation.warning);
      }

      const entries = buildDebtPaymentEntries(account.linkedLedgerCode, calculation, totalPayment);
      assertEntriesBalanced(entries);

      const openingBalance =
        currentSnapshot?.openingBalance ?? previousSnapshot?.closingBalance ?? account.currentBalance;
      const principalPaid = (currentSnapshot?.principalPaid ?? 0) + calculation.principal;
      const closingBalance = openingBalance - principalPaid;
      const defaultDesc = `${account.name} ${yearMonth} 還款`;

      await debtSnapshotRepository.upsertSnapshot(
        householdId,
        debtAccountId,
        {
          yearMonth,
          openingBalance: currentSnapshot ? currentSnapshot.openingBalance : openingBalance,
          principalPaid: calculation.principal,
          interestPaid: calculation.interest,
          totalPaid: totalPayment,
          closingBalance,
        },
        userEmail,
        tx,
      );
      await debtAccountRepository.updateDebtAccount(
        householdId,
        debtAccountId,
        { currentBalance: closingBalance },
        userEmail,
        tx,
      );
      const transactionId = await transactionRepository.create(
        [householdId],
        {
          date,
          description: description ?? defaultDesc,
          intentType: 'DEBT_PAYMENT',
          amount: totalPayment,
          projectId: projectId ?? account.linkedProjectId ?? null,
          debtAccountId,
          allocationId: null,
          createdBy: userEmail,
          entries,
        },
        userEmail,
        tx,
      );

      const result: CreateDebtPaymentResult = {
        transactionId,
        principal: calculation.principal,
        interest: calculation.interest,
        newBalance: closingBalance,
      };
      const resultReference: OperationResultReference = {
        debtAccountId,
        yearMonth,
        ...result,
      };

      await operationRepository.createSucceeded(
        householdId,
        DEBT_PAYMENT_OPERATION_TYPE,
        idempotencyKey,
        DEBT_PAYMENT_FINGERPRINT_VERSION,
        payloadFingerprint,
        resultReference,
        auth.uid,
        tx,
      );

      return result;
    });
  }
}

export const createDebtPaymentUseCase = new CreateDebtPaymentUseCase();

const readDebtPaymentResult = (
  reference: OperationResultReference | null,
): CreateDebtPaymentResult => {
  if (
    !reference ||
    typeof reference.transactionId !== 'string' ||
    typeof reference.principal !== 'number' ||
    typeof reference.interest !== 'number' ||
    typeof reference.newBalance !== 'number'
  ) {
    throw new Error('Invalid DEBT_PAYMENT operation result reference');
  }

  return {
    transactionId: reference.transactionId,
    principal: reference.principal,
    interest: reference.interest,
    newBalance: reference.newBalance,
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPrevYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1); // month-1 for 0-indexed, then -1 more
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
