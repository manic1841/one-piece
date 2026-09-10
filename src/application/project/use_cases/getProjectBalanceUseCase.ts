import { isTransactionProjectIncome } from '@/domains/ledger/intentMapping';
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
      ? new Date(latestSnapshot.year, latestSnapshot.month, 0, 23, 59, 59)
      : new Date(0);
    const currentDate = new Date();

    // Get all transactions after snapshot date (server-side filtered)
    const transactionsSinceSnapshot = await transactionRepository.listByProject(
      householdId,
      projectId,
      snapshotDate,
    );

    // Calculate impact from direct project transactions
    let transactionImpact = 0;
    for (const tx of transactionsSinceSnapshot) {
      if (isTransactionProjectIncome(tx.intentType, tx.intent)) {
        transactionImpact += tx.amount ?? 0;
      } else {
        transactionImpact -= tx.amount ?? 0;
      }
    }
    // Include transfer records where this project is either source or destination
    const transferSinceSnapshot = await transactionRepository.listTransfersByProject(
      householdId,
      projectId,
      undefined,
      snapshotDate,
    );

    for (const tx of transferSinceSnapshot) {
      if (tx.projectId === projectId) {
        // This is a transfer out from this project
        transactionImpact -= tx.amount ?? 0;
      } else {
        // This is a transfer into this project
        transactionImpact += tx.amount ?? 0;
      }
    }

    // Get allocations since snapshot to calculate allocation impacts.
    // The snapshot closing balance already includes the snapshot month's
    // allocations, so exclude that month (use next month as the lower bound).
    const sinceYearMonth = latestSnapshot
      ? (() => {
          const d = new Date(latestSnapshot.year, latestSnapshot.month, 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        })()
      : undefined;
    const allocations = await allocationRepository.listByProject(
      householdId,
      projectId,
      undefined,
      sinceYearMonth,
    );

    // Calculate impact from allocations (only allocation-derived amounts)
    let allocationImpact = 0;
    const processedSourceTxIds = new Set<string>();

    for (const allocation of allocations) {
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
