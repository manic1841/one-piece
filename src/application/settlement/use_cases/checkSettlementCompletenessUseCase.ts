import { householdPermissionService } from '@/application/household/householdPermissionService';
import { type AuthContext } from '@/application/types';
import { type Allocation } from '@/domains/allocation/schemas';
import { isLoanActiveInMonth } from '@/domains/debt/debtPaymentCalculator';
import { type Transaction } from '@/domains/ledger/schemas';
import { type WatchListTargetType } from '@/domains/watch_list/schemas';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';
import { watchListRepository } from '@/infra/repositories/watchListRepository';

export const CompletenessActivityStatus = {
  HAS_ACTIVITY: 'HAS_ACTIVITY',
  ZERO_ACTIVITY: 'ZERO_ACTIVITY',
} as const;
export type CompletenessActivityStatus =
  (typeof CompletenessActivityStatus)[keyof typeof CompletenessActivityStatus];

export interface CompletenessActivity {
  targetType: WatchListTargetType;
  targetId: string;
  name: string;
  status: CompletenessActivityStatus;
  activityCount: number;
  activityAmount: number;
}

export interface SettlementCompletenessResult {
  yearMonth: string;
  activities: CompletenessActivity[];
  /** Watched targets with zero activity: the subset that needs per-item confirmation. */
  anomalies: CompletenessActivity[];
}

export interface CheckSettlementCompletenessRequest {
  householdId: string;
  year: number;
  month: number;
  auth: AuthContext;
}

/**
 * Codes touched by a transaction. `ledgerCodes` is the denormalized index the
 * spec names; `entries` is the authoritative source it is derived from, used
 * only for records written before the index existed.
 */
const entryCodes = (transaction: Transaction): string[] =>
  transaction.ledgerCodes ?? (transaction.entries ?? []).map((entry) => entry.ledgerCode);

interface ActivityTally {
  count: number;
  amount: number;
}

/**
 * Per-code movement for one transaction, taken from the journal lines so a
 * multi-code transaction does not attribute its whole amount to every code.
 * Returns null when entries are absent (pre-denormalization records), in which
 * case callers fall back to the transaction total.
 */
const entryAmountByCode = (transaction: Transaction): Map<string, number> | null => {
  const entries = transaction.entries;
  if (!entries || entries.length === 0) return null;
  const amounts = new Map<string, number>();
  for (const entry of entries) {
    const movement = entry.debit || entry.credit || 0;
    amounts.set(entry.ledgerCode, (amounts.get(entry.ledgerCode) ?? 0) + movement);
  }
  return amounts;
};

/** One pass over the month's transactions, tallied per ledger code (deduped within a transaction). */
const tallyLedgerCodes = (transactions: Transaction[]): Map<string, ActivityTally> => {
  const tallies = new Map<string, ActivityTally>();
  for (const transaction of transactions) {
    const amountByCode = entryAmountByCode(transaction);
    const fallbackAmount = transaction.amount ?? 0;
    for (const ledgerCode of new Set(entryCodes(transaction))) {
      const tally = tallies.get(ledgerCode) ?? { count: 0, amount: 0 };
      tally.count += 1;
      // Zero per-line movement means the record carries no amounts; fall back
      // to the transaction total, the same as a missing entries array.
      tally.amount += amountByCode?.get(ledgerCode) || fallbackAmount;
      tallies.set(ledgerCode, tally);
    }
  }
  return tallies;
};

/** One pass over the month's allocations, tallied per watched project. */
const tallyProjects = (allocations: Allocation[], watchedIds: Set<string>) => {
  const tallies = new Map<string, ActivityTally>();
  for (const allocation of allocations) {
    const counted = new Set<string>();
    for (const item of allocation.items ?? []) {
      if (!watchedIds.has(item.projectId)) continue;
      const tally = tallies.get(item.projectId) ?? { count: 0, amount: 0 };
      if (!counted.has(item.projectId)) {
        counted.add(item.projectId);
        tally.count += 1;
      }
      tally.amount += item.amount;
      tallies.set(item.projectId, tally);
    }
  }
  return tallies;
};

/** One pass over the month's repayments, tallied per debt account. */
const tallyRepayments = (payments: Transaction[]): Map<string, ActivityTally> => {
  const tallies = new Map<string, ActivityTally>();
  for (const payment of payments) {
    if (!payment.debtAccountId) continue;
    const tally = tallies.get(payment.debtAccountId) ?? { count: 0, amount: 0 };
    tally.count += 1;
    tally.amount += payment.amount ?? 0;
    tallies.set(payment.debtAccountId, tally);
  }
  return tallies;
};

const statusOf = (count: number): CompletenessActivityStatus =>
  count > 0 ? CompletenessActivityStatus.HAS_ACTIVITY : CompletenessActivityStatus.ZERO_ACTIVITY;

/**
 * Read-only settlement completeness check (ADR-0048): counts, in memory,
 * whether each watched project had an allocation, each watched ledger code
 * appeared in a transaction, and each watched debt account received a
 * DEBT_PAYMENT in the target month. Reuses the same allocation, transaction and
 * repayment queries the settlement flow already runs; no write path.
 */
export class CheckSettlementCompletenessUseCase {
  async execute(
    request: CheckSettlementCompletenessRequest,
  ): Promise<SettlementCompletenessResult> {
    const { householdId, year, month, auth } = request;

    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);
    const targets = await watchListRepository.listTargets(householdId);
    const projectTargets = targets.filter((target) => target.targetType === 'PROJECT');
    const codeTargets = targets.filter((target) => target.targetType === 'LEDGER_CODE');
    const debtTargets = targets.filter((target) => target.targetType === 'DEBT_ACCOUNT');

    const activities: CompletenessActivity[] = [];

    if (projectTargets.length > 0) {
      // getProjects(includeInactive=false) returns active projects only; the
      // explicit isActive filter keeps the "inactive projects skip the check"
      // rule (issue #94) enforced at this call site as well.
      const projects = await projectRepository.getProjects(householdId);
      const activeById = new Map(
        projects.filter((project) => project.isActive).map((project) => [project.id, project]),
      );
      const watchedActive = projectTargets.filter((target) => activeById.has(target.targetId));
      const allocations =
        watchedActive.length > 0
          ? await allocationRepository.getAllocationsByMonth(householdId, yearMonth)
          : [];
      const tallyByProject = tallyProjects(
        allocations,
        new Set(watchedActive.map((target) => target.targetId)),
      );
      for (const target of watchedActive) {
        const { count, amount } = tallyByProject.get(target.targetId) ?? { count: 0, amount: 0 };
        activities.push({
          targetType: 'PROJECT',
          targetId: target.targetId,
          name: activeById.get(target.targetId)?.name ?? target.name,
          status: statusOf(count),
          activityCount: count,
          activityAmount: amount,
        });
      }
    }

    if (codeTargets.length > 0) {
      const transactions = await transactionRepository.listByDateRange(
        householdId,
        monthStart,
        monthEnd,
      );
      const tallies = tallyLedgerCodes(transactions);
      for (const target of codeTargets) {
        const { count, amount } = tallies.get(target.targetId) ?? { count: 0, amount: 0 };
        activities.push({
          targetType: 'LEDGER_CODE',
          targetId: target.targetId,
          name: target.name,
          status: statusOf(count),
          activityCount: count,
          activityAmount: amount,
        });
      }
    }

    if (debtTargets.length > 0) {
      // Repayment is measured by DEBT_PAYMENT transactions rather than by
      // activity on the debt's linkedLedgerCode (ADR-0048 decision 2): a loan
      // advanced in the same month would keep that code's activity non-zero and
      // hide the missed repayment.
      // getDebtAccounts(includeInactive=false) already filters server-side; the
      // explicit isActive check keeps "inactive debts skip the check" (issue
      // #95) enforced at this call site, same as the project branch above.
      const accounts = await debtAccountRepository.getDebtAccounts(householdId);
      const activeById = new Map(
        accounts
          .filter(
            (account) =>
              account.isActive &&
              isLoanActiveInMonth(account.startDate, account.endDate, monthStart),
          )
          .map((account) => [account.id, account]),
      );
      const watchedActive = debtTargets.filter((target) => activeById.has(target.targetId));
      const payments =
        watchedActive.length > 0
          ? await transactionRepository.listDebtPaymentsByDateRange(
              householdId,
              monthStart,
              monthEnd,
            )
          : [];
      const tallyByAccount = tallyRepayments(payments);
      for (const target of watchedActive) {
        const { count, amount } = tallyByAccount.get(target.targetId) ?? { count: 0, amount: 0 };
        activities.push({
          targetType: 'DEBT_ACCOUNT',
          targetId: target.targetId,
          name: activeById.get(target.targetId)?.name ?? target.name,
          status: statusOf(count),
          activityCount: count,
          activityAmount: amount,
        });
      }
    }

    const anomalies = activities.filter(
      (activity) => activity.status === CompletenessActivityStatus.ZERO_ACTIVITY,
    );
    return { yearMonth, activities, anomalies };
  }
}

export const checkSettlementCompletenessUseCase = new CheckSettlementCompletenessUseCase();
