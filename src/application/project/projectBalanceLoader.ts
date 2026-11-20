import { calculateProjectBalance } from '@/domains/project/calculators/projectBalanceCalculator';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface ProjectBalanceResponse {
  balance: number;
  year: number;
  month: number;
  lastSettledYearMonth: string | null;
}

/**
 * Derives one project's live balance: the newest snapshot's closing balance
 * plus everything booked after it. Does no permission check, so a batch caller
 * can check once and reuse this per project, and a single-project use case can
 * check on its own before calling.
 */
export const loadProjectBalance = async (
  householdId: string,
  projectId: string,
): Promise<ProjectBalanceResponse> => {
  const latestSnapshot = await projectSnapshotRepository.getLatest(householdId, projectId);

  // If there's no snapshot, start from 0 balance
  const baseBalance = latestSnapshot?.closingBalance ?? 0;
  const snapshotDate = latestSnapshot
    ? new Date(latestSnapshot.year, latestSnapshot.month, 0, 23, 59, 59)
    : new Date(0);
  const currentDate = new Date();

  const transactionsSinceSnapshot = await transactionRepository.listByProject({
    householdId,
    projectId,
    sinceDate: snapshotDate,
  });

  const transferSinceSnapshot = await transactionRepository.listTransfersByProject({
    householdId,
    projectId,
    sinceDate: snapshotDate,
  });

  // The snapshot closing balance already includes the snapshot month's
  // allocations, so exclude that month (use next month as the lower bound).
  const sinceYearMonth = latestSnapshot
    ? (() => {
        const d = new Date(latestSnapshot.year, latestSnapshot.month, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })()
    : undefined;
  const allocations = await allocationRepository.listByProject({
    householdId,
    projectId,
    sinceYearMonth,
  });

  const balance = calculateProjectBalance({
    projectId,
    baseBalance,
    transactions: transactionsSinceSnapshot,
    transfers: transferSinceSnapshot,
    allocations,
  });

  return {
    balance,
    year: currentDate.getFullYear(),
    month: currentDate.getMonth() + 1,
    lastSettledYearMonth: latestSnapshot
      ? `${latestSnapshot.year}-${String(latestSnapshot.month).padStart(2, '0')}`
      : null,
  };
};
