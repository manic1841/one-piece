import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import {
  assertEntriesBalanced,
  buildDebtPaymentEntries,
  calculateSplit,
} from '@/domains/debt/debtPaymentCalculator';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface CreateDebtPaymentRequest {
  householdId: string;
  userEmail: string;
  auth: AuthContext;
  debtAccountId: string;
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
 * Orchestrates a DEBT_PAYMENT operation atomically (sequential writes):
 *  1. Fetch DebtAccount for balance & linkedLedgerCode
 *  2. Calculate principal/interest split
 *  3. Build & validate journal entries
 *  4. Write Transaction (intentType: DEBT_PAYMENT)
 *  5. Upsert DebtSnapshot for the payment's yearMonth
 *  6. Update DebtAccount.currentBalance → closingBalance
 */
export class CreateDebtPaymentUseCase {
  async execute(request: CreateDebtPaymentRequest): Promise<CreateDebtPaymentResult> {
    const { householdId, userEmail, auth, debtAccountId, totalPayment, date, description, projectId } =
      request;

    await householdPermissionService.assertWritePermission(householdId, auth.uid, auth.isGlobalAdmin);

    // 1. Load account
    const account = await debtAccountRepository.get([householdId, debtAccountId]);
    if (!account) throw new Error(`DebtAccount ${debtAccountId} not found`);
    if (!account.isActive) throw new Error('Cannot record payment on an inactive debt account');

    // 2. Split calculation
    const { principal, interest, warning } = calculateSplit(
      account.currentBalance,
      account.interestRate,
      totalPayment,
    );

    if (warning) {
      // Still allow the transaction — caller may choose to surface warning in UI
      console.warn('[CreateDebtPaymentUseCase]', warning);
    }

    // 3. Build & validate entries
    const entries = buildDebtPaymentEntries(
      account.linkedLedgerCode,
      principal,
      interest,
      totalPayment,
    );
    assertEntriesBalanced(entries);

    // 4. Write Transaction
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const defaultDesc = `${account.name} ${yearMonth} 還款`;

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
    );

    // 5. Upsert DebtSnapshot
    // Determine opening balance: prior snapshot's closing, or derive from current
    const prevYearMonth = getPrevYearMonth(yearMonth);
    const prevSnapshot = await debtSnapshotRepository.getSnapshot(
      householdId,
      debtAccountId,
      prevYearMonth,
    );
    const openingBalance = prevSnapshot
      ? prevSnapshot.closingBalance
      : account.currentBalance + principal; // reverse-engineer: before this payment

    const closingBalance = openingBalance - principal;

    await debtSnapshotRepository.upsertSnapshot(
      householdId,
      debtAccountId,
      {
        yearMonth,
        openingBalance,
        principalPaid: principal,
        interestPaid: interest,
        totalPaid: totalPayment,
        closingBalance,
      },
      userEmail,
    );

    // 6. Update currentBalance on DebtAccount
    await debtAccountRepository.updateDebtAccount(
      householdId,
      debtAccountId,
      { currentBalance: closingBalance },
      userEmail,
    );

    return { transactionId, principal, interest, newBalance: closingBalance };
  }
}

export const createDebtPaymentUseCase = new CreateDebtPaymentUseCase();

// ── Helpers ──────────────────────────────────────────────────────────────────

function getPrevYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 2, 1); // month-1 for 0-indexed, then -1 more
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
