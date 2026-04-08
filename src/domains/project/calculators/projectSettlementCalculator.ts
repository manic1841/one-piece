import { isTransactionProjectIncome } from '@/domains/ledger/intentMapping';
import { type ProjectSnapshotCreate } from '@/domains/project/schemas';

export interface SettlementAllocationInput {
  direction?: 'INCOME' | 'EXPENSE' | null;
  items: Array<{
    projectId: string;
    amount: number;
  }>;
}

export interface SettlementTransactionInput {
  amount?: number | null;
  intentType?: string | null;
  intent?: string | null;
  fromProjectId?: string | null;
  toProjectId?: string | null;
}

interface CalculateProjectSettlementSnapshotParams {
  year: number;
  month: number;
  projectId: string;
  openingBalance: number;
  allocations: SettlementAllocationInput[];
  transfers: SettlementTransactionInput[];
  projectTransactions: SettlementTransactionInput[];
}

export function calculateProjectSettlementSnapshot(
  params: CalculateProjectSettlementSnapshotParams,
): ProjectSnapshotCreate {
  const { year, month, projectId, openingBalance, allocations, transfers, projectTransactions } =
    params;

  const incomeFromAllocations = allocations
    .filter((allocation) => allocation.direction !== 'EXPENSE')
    .flatMap((a) => a.items)
    .filter((item) => item.projectId === projectId)
    .reduce((sum, item) => sum + item.amount, 0);

  const expenseFromAllocations = allocations
    .filter((allocation) => allocation.direction === 'EXPENSE')
    .flatMap((a) => a.items)
    .filter((item) => item.projectId === projectId)
    .reduce((sum, item) => sum + item.amount, 0);

  const incomeFromTransfers = transfers
    .filter((transaction) => transaction.toProjectId === projectId)
    .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

  const expenseFromTransfers = transfers
    .filter((transaction) => transaction.fromProjectId === projectId)
    .reduce((sum, transaction) => sum + (transaction.amount || 0), 0);

  let directExpenses = 0;
  let directIncomes = 0;
  for (const transaction of projectTransactions) {
    if (isTransactionProjectIncome(transaction.intentType, transaction.intent)) {
      directIncomes += transaction.amount || 0;
    } else {
      directExpenses += transaction.amount || 0;
    }
  }

  const income = directIncomes + incomeFromAllocations + incomeFromTransfers;
  const expense = directExpenses + expenseFromTransfers + expenseFromAllocations;
  const closingBalance = openingBalance + income - expense;

  return {
    year,
    month,
    openingBalance,
    income,
    expense,
    closingBalance,
  };
}
