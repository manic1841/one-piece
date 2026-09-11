import { isTransactionProjectIncome } from '@/domains/ledger/intentMapping';

export interface ProjectBalanceTransactionInput {
  id?: string;
  amount?: number | null;
  intentType?: string | null;
  intent?: string | null;
  projectId?: string | null;
  fromProjectId?: string | null;
  toProjectId?: string | null;
}

export interface ProjectBalanceAllocationInput {
  sourceTransactionId?: string;
  direction?: 'INCOME' | 'EXPENSE' | null;
  items: Array<{
    projectId: string;
    amount: number;
  }>;
}

interface CalculateProjectBalanceParams {
  projectId: string;
  baseBalance: number;
  transactions: ProjectBalanceTransactionInput[];
  transfers: ProjectBalanceTransactionInput[];
  allocations: ProjectBalanceAllocationInput[];
}

/**
 * Derives the current project balance from the latest snapshot closing balance
 * plus every transaction, transfer, and allocation recorded after that snapshot.
 *
 * Transfers are directed by fromProjectId/toProjectId: a transfer whose
 * toProjectId matches is an inflow, one whose fromProjectId matches is an
 * outflow. Records touching neither project are ignored.
 */
export function calculateProjectBalance(params: CalculateProjectBalanceParams): number {
  const { projectId, baseBalance, transactions, transfers, allocations } = params;

  let transactionImpact = 0;
  for (const transaction of transactions) {
    if (isTransactionProjectIncome(transaction.intentType, transaction.intent)) {
      transactionImpact += transaction.amount ?? 0;
    } else {
      transactionImpact -= transaction.amount ?? 0;
    }
  }

  let transferImpact = 0;
  for (const transfer of transfers) {
    if (transfer.toProjectId === projectId) {
      transferImpact += transfer.amount ?? 0;
    } else if (transfer.fromProjectId === projectId) {
      transferImpact -= transfer.amount ?? 0;
    }
  }

  let allocationImpact = 0;
  const processedSourceTxIds = new Set<string>();

  for (const allocation of allocations) {
    if (processedSourceTxIds.has(allocation.sourceTransactionId ?? '')) {
      continue;
    }

    const allocatedItem = allocation.items.find((item) => item.projectId === projectId);
    if (!allocatedItem) {
      continue;
    }

    const isDirectTx = transactions.some(
      (transaction) =>
        transaction.id === allocation.sourceTransactionId && transaction.projectId === projectId,
    );
    if (isDirectTx) {
      continue;
    }

    processedSourceTxIds.add(allocation.sourceTransactionId ?? '');

    const sign = allocation.direction === 'EXPENSE' ? -1 : 1;
    allocationImpact += allocatedItem.amount * sign;
  }

  return baseBalance + transactionImpact + transferImpact + allocationImpact;
}
