import { type ProjectTransaction, type Transaction, TransactionType } from '@/domains/record/types';

export const calculateBalance = (
  initialBalance: number,
  projectId: string,
  transactions: Transaction[],
  projectTransactions: ProjectTransaction[],
): number => {
  let balance = initialBalance;

  // calculate balance from transactions
  for (const txn of transactions) {
    if (txn.type === TransactionType.INCOME) {
      balance += txn.amount;
    } else if (txn.type === TransactionType.EXPENSE) {
      balance = balance - txn.amount;
    }
  }

  // calculate balance from project transactions
  for (const ptxn of projectTransactions) {
    if (ptxn.fromProjectId === projectId) {
      balance -= ptxn.amount;
    } else if (ptxn.toProjectId === projectId) {
      balance += ptxn.amount;
    }
  }

  return balance;
};
