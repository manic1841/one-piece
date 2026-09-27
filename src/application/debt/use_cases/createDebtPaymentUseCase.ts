import { type Transaction as FirestoreTransaction, runTransaction } from 'firebase/firestore';

import { DebtPaymentCommandError, DebtPaymentCommandErrorCode } from '@/application/debt/errors';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import {
  assertEntriesBalanced,
  buildDebtPaymentEntries,
  calculateDebtPayment,
} from '@/domains/debt/debtPaymentCalculator';
import { type DebtAccount, type DebtSnapshot } from '@/domains/debt/schemas';
import {
  DEBT_PAYMENT_FINGERPRINT_VERSION,
  DEBT_PAYMENT_OPERATION_TYPE,
  createDebtPaymentFingerprint,
} from '@/domains/operation/fingerprint';
import { type OperationResultReference } from '@/domains/operation/schemas';
import { type OperationRecord } from '@/domains/operation/schemas';
import { db } from '@/firebase';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { operationRepository } from '@/infra/repositories/operationRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface CreateDebtPaymentRequest {
  householdId: string;
  userEmail: string;
  auth: AuthContext;
  debtAccountId: string;
  idempotencyKey: string;
  totalPayment: number; // user-confirmed total repayment amount; 0 clears the month's record
  date: Date;
  description?: string;
  projectId?: string | null;
}

export interface CreateDebtPaymentResult {
  /** null when the payment amount is 0 (month record cleared). */
  transactionId: string | null;
  principal: number;
  interest: number;
  newBalance: number;
}

/**
 * Orchestrates a DEBT_PAYMENT operation atomically. Reconfirming the same
 * month + account re-books the record (idempotent replace): an unchanged
 * payload returns the stored result; a changed payload deletes the previous
 * stage repayment transaction, re-derives the snapshot, and creates the new
 * transaction — all inside one Firestore transaction.
 */
export class CreateDebtPaymentUseCase {
  async execute(request: CreateDebtPaymentRequest): Promise<CreateDebtPaymentResult> {
    const { householdId, auth, idempotencyKey } = request;

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

    return runTransaction(db, (tx) => this.apply(tx, request));
  }

  /**
   * The split of the confirmed total between principal and interest. A
   * cleared month (totalPayment = 0) has no split.
   */
  private resolveCalculation(
    request: CreateDebtPaymentRequest,
    account: DebtAccount,
    monthContext: {
      currentSnapshot: DebtSnapshot | null;
      openingBalance: number;
    },
    previousContribution: { principal: number; interest: number },
  ) {
    const { totalPayment, date } = request;
    if (totalPayment <= 0) return null;

    const calculation = calculateDebtPayment({
      currentBalance: monthContext.openingBalance,
      interestRate: account.interestRate,
      totalPayment,
      paymentDate: date,
      startDate: account.startDate,
      graceEndDate: account.graceEndDate,
      // Same-month cumulation draws from other repayments' booked
      // interest; this key's previous contribution is replaced, not
      // consumed, so a re-confirmation recalculates from a fresh pool.
      interestAlreadyPaidThisMonth: Math.max(
        0,
        (monthContext.currentSnapshot?.interestPaid ?? 0) - previousContribution.interest,
      ),
    });
    if (calculation.warning) {
      console.warn('[CreateDebtPaymentUseCase]', calculation.warning);
    }
    return calculation;
  }

  /**
   * One atomic re-booking: all reads (operation, account, month context)
   * happen first, then the replay check, then every write. Firestore
   * transactions require all reads before all writes.
   */
  private async apply(
    tx: FirestoreTransaction,
    request: CreateDebtPaymentRequest,
  ): Promise<CreateDebtPaymentResult> {
    const { householdId, debtAccountId, idempotencyKey, totalPayment, date } = request;

    const existingOperation = await operationRepository.getByKey(
      householdId,
      DEBT_PAYMENT_OPERATION_TYPE,
      idempotencyKey,
      tx,
    );

    const account = await this.readActiveAccount(tx, request);
    const monthContext = await this.readMonthContext(tx, request);

    const payloadFingerprint = await createDebtPaymentFingerprint({
      operationType: DEBT_PAYMENT_OPERATION_TYPE,
      fingerprintVersion: DEBT_PAYMENT_FINGERPRINT_VERSION,
      debtAccountId,
      totalPayment,
      paymentDate: date,
      description: request.description,
      explicitProjectId: request.projectId,
      openingBalance: monthContext.openingBalance,
    });

    const replay = this.resolveReplay(existingOperation, payloadFingerprint);
    if (replay) return readDebtPaymentResult(replay);

    const previousContribution = readDebtPaymentContribution(
      existingOperation?.resultReference ?? null,
    );
    const result = await this.bookRepayment(
      tx,
      request,
      account,
      monthContext,
      existingOperation,
      previousContribution,
      payloadFingerprint,
    );
    return result;
  }

  private async readActiveAccount(tx: FirestoreTransaction, request: CreateDebtPaymentRequest) {
    const account = await debtAccountRepository.get(
      [request.householdId, request.debtAccountId],
      tx,
    );
    if (!account) throw new Error(`DebtAccount ${request.debtAccountId} not found`);
    if (!account.isActive) throw new Error('Cannot record payment on an inactive debt account');
    return account;
  }

  private async readMonthContext(tx: FirestoreTransaction, request: CreateDebtPaymentRequest) {
    const yearMonth = `${request.date.getFullYear()}-${String(request.date.getMonth() + 1).padStart(2, '0')}`;
    const currentSnapshot = await debtSnapshotRepository.getSnapshot(
      request.householdId,
      request.debtAccountId,
      yearMonth,
      tx,
    );
    const previousSnapshot = currentSnapshot
      ? null
      : await debtSnapshotRepository.getSnapshot(
          request.householdId,
          request.debtAccountId,
          getPrevYearMonth(yearMonth),
          tx,
        );

    return {
      yearMonth,
      currentSnapshot,
      openingBalance:
        currentSnapshot?.openingBalance ??
        previousSnapshot?.closingBalance ??
        (await debtAccountRepository.get([request.householdId, request.debtAccountId], tx))
          ?.currentBalance ??
        0,
    };
  }

  /**
   * Replay resolution: an unchanged payload on a succeeded operation returns
   * the stored result; a changed payload falls through to the idempotent
   * replace; an unfinished operation is refused.
   */
  private resolveReplay(
    existingOperation: OperationRecord | null,
    payloadFingerprint: string,
  ): OperationResultReference | null {
    if (!existingOperation) return null;
    if (existingOperation.status === 'SUCCEEDED') {
      if (existingOperation.payloadFingerprint === payloadFingerprint) {
        return existingOperation.resultReference;
      }
      return null;
    }
    throw new DebtPaymentCommandError(
      DebtPaymentCommandErrorCode.OPERATION_IN_PROGRESS,
      'the idempotent payment operation is not complete',
    );
  }

  private async bookRepayment(
    tx: FirestoreTransaction,
    request: CreateDebtPaymentRequest,
    account: DebtAccount,
    monthContext: {
      yearMonth: string;
      currentSnapshot: DebtSnapshot | null;
      openingBalance: number;
    },
    existingOperation: OperationRecord | null,
    previousContribution: { principal: number; interest: number },
    payloadFingerprint: string,
  ): Promise<CreateDebtPaymentResult> {
    const { householdId, userEmail, debtAccountId, totalPayment, date } = request;
    const { yearMonth, currentSnapshot, openingBalance } = monthContext;

    const calculation = this.resolveCalculation(
      request,
      account,
      monthContext,
      previousContribution,
    );
    const entries = calculation
      ? buildDebtPaymentEntries(account.linkedLedgerCode, calculation, totalPayment)
      : [];
    if (calculation) {
      assertEntriesBalanced(entries);
    }

    // A re-confirmation replaces the month's record: the snapshot upsert
    // cumulates, so the previous operation's contribution is removed to keep
    // the re-booking a replacement rather than a double booking. A cleared
    // month (totalPayment = 0) contributes nothing.
    const principalDelta = (calculation?.principal ?? 0) - previousContribution.principal;
    const interestDelta = (calculation?.interest ?? 0) - previousContribution.interest;
    const totalPaidDelta =
      totalPayment - (previousContribution.principal + previousContribution.interest);

    const principalPaid = (currentSnapshot?.principalPaid ?? 0) + principalDelta;
    const closingBalance = openingBalance - principalPaid;
    const defaultDesc = `${account.name} ${yearMonth} 還款`;

    await debtSnapshotRepository.upsertSnapshot(
      householdId,
      debtAccountId,
      {
        yearMonth,
        openingBalance: currentSnapshot ? currentSnapshot.openingBalance : openingBalance,
        principalPaid: principalDelta,
        interestPaid: interestDelta,
        totalPaid: totalPaidDelta,
        closingBalance,
      },
      userEmail,
      tx,
    );
    // All reads are done: the previous transaction is deleted after the
    // snapshot upsert so the re-booking stays inside one atomic boundary.
    const previousTransactionId = readDebtPaymentTransactionId(
      existingOperation?.resultReference ?? null,
    );
    if (previousTransactionId) {
      await transactionRepository.delete([householdId, previousTransactionId], tx);
    }
    await debtAccountRepository.updateDebtAccount(
      householdId,
      debtAccountId,
      { currentBalance: closingBalance },
      userEmail,
      tx,
    );
    const transactionId =
      totalPayment > 0
        ? await transactionRepository.create(
            [householdId],
            {
              date,
              description: request.description ?? defaultDesc,
              intentType: 'DEBT_PAYMENT',
              amount: totalPayment,
              projectId: request.projectId ?? account.linkedProjectId ?? null,
              debtAccountId,
              allocationId: null,
              createdBy: userEmail,
              entries,
            },
            userEmail,
            tx,
          )
        : null;

    const result: CreateDebtPaymentResult = {
      transactionId,
      principal: calculation?.principal ?? 0,
      interest: calculation?.interest ?? 0,
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
      request.idempotencyKey,
      DEBT_PAYMENT_FINGERPRINT_VERSION,
      payloadFingerprint,
      resultReference,
      request.auth.uid,
      tx,
    );

    return result;
  }
}

export const createDebtPaymentUseCase = new CreateDebtPaymentUseCase();

const readDebtPaymentResult = (
  reference: OperationResultReference | null,
): CreateDebtPaymentResult => {
  if (
    !reference ||
    typeof reference.principal !== 'number' ||
    typeof reference.interest !== 'number' ||
    typeof reference.newBalance !== 'number'
  ) {
    throw new Error('Invalid DEBT_PAYMENT operation result reference');
  }

  return {
    transactionId: typeof reference.transactionId === 'string' ? reference.transactionId : null,
    principal: reference.principal,
    interest: reference.interest,
    newBalance: reference.newBalance,
  };
};

const readDebtPaymentTransactionId = (
  reference: OperationResultReference | null,
): string | null => {
  if (!reference) return null;
  return typeof reference.transactionId === 'string' ? reference.transactionId : null;
};

const readDebtPaymentContribution = (
  reference: OperationResultReference | null,
): { principal: number; interest: number } => {
  if (!reference) return { principal: 0, interest: 0 };
  return {
    principal: typeof reference.principal === 'number' ? reference.principal : 0,
    interest: typeof reference.interest === 'number' ? reference.interest : 0,
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPrevYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1); // month-1 for 0-indexed, then -1 more
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
