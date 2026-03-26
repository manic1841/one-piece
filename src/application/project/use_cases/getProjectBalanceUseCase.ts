import { IntentType } from '@/domains/ledger/constants';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export interface GetProjectBalanceRequest {
  householdId: string;
  projectId: string;
}

export interface ProjectBalanceResponse {
  balance: number;
  year: number;
  month: number;
}

const toMillis = (value: unknown): number => {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (
    value &&
    typeof value === 'object' &&
    'seconds' in value &&
    typeof (value as { seconds?: unknown }).seconds === 'number'
  ) {
    return ((value as { seconds: number }).seconds || 0) * 1000;
  }

  return 0;
};

export class GetProjectBalanceUseCase {
  async execute(request: GetProjectBalanceRequest): Promise<ProjectBalanceResponse | null> {
    const { householdId, projectId } = request;
    const project = await projectRepository.get([householdId, projectId]);
    if (!project) return null;

    // Get latest snapshot from project metadata or snapshot repo
    const latestSnapshot = await projectSnapshotRepository.getLatest(householdId, projectId);

    // If there's no snapshot, start from 0 balance
    const baseBalance = latestSnapshot?.closingBalance ?? 0;
    const snapshotDate = latestSnapshot
      ? new Date(latestSnapshot.year, latestSnapshot.month, 0)
      : new Date(0);
    const currentDate = new Date();

    // Get all transactions after snapshot date
    const allTransactions = await transactionRepository.listByProject(householdId, projectId);
    const transactionsSinceSnapshot = allTransactions.filter(
      (tx) => toMillis(tx.date) >= snapshotDate.getTime(),
    );

    // Calculate impact from direct project transactions
    let transactionImpact = 0;
    for (const tx of transactionsSinceSnapshot) {
      // For TRANSFER transactions, check from/toProjectId
      if (tx.intentType === IntentType.TRANSFER) {
        if (tx.toProjectId === projectId) {
          transactionImpact += tx.amount ?? 0;
        }
        if (tx.fromProjectId === projectId) {
          transactionImpact -= tx.amount ?? 0;
        }
      } else if (tx.projectId === projectId) {
        // Direct project transactions - use the transaction amount
        // The amount field represents the impact on the project
        transactionImpact += tx.amount ?? 0;
      }
    }

    // Get allocations since snapshot to calculate allocation impacts
    const allocations = await allocationRepository.listByProject(householdId, projectId);
    const allocationsSinceSnapshot = allocations.filter((allocation) => {
      const [allocYear, allocMonth] = allocation.yearMonth.split('-').map(Number);
      const allocDate = new Date(allocYear, allocMonth - 1, 1);
      return allocDate.getTime() >= snapshotDate.getTime();
    });

    // Calculate impact from allocations (only allocation-derived amounts)
    let allocationImpact = 0;
    const processedSourceTxIds = new Set<string>();

    for (const allocation of allocationsSinceSnapshot) {
      // Skip if this is a direct project transaction (avoid double counting)
      if (processedSourceTxIds.has(allocation.sourceTransactionId)) {
        continue;
      }

      const allocatedItem = allocation.items.find((item) => item.projectId === projectId);
      if (!allocatedItem) {
        continue;
      }

      // Check if the source transaction is a direct project transaction (avoid double counting)
      const isDirectTx = transactionsSinceSnapshot.some(
        (tx) => tx.id === allocation.sourceTransactionId && tx.projectId === projectId,
      );
      if (isDirectTx) {
        continue;
      }

      processedSourceTxIds.add(allocation.sourceTransactionId);

      // EXPENSE allocations should be negative
      const sign = allocation.direction === 'EXPENSE' ? -1 : 1;
      allocationImpact += allocatedItem.amount * sign;
    }

    const currentBalance = baseBalance + transactionImpact + allocationImpact;

    return {
      balance: currentBalance,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    };
  }
}

export const getProjectBalanceUseCase = new GetProjectBalanceUseCase();
