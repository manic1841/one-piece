import { type Record, RecordType, TransactionType } from '@/domains/record/types';

export const calculateRecordStats = (records: Record[]) => {
  const incomes: number[] = [];
  const expenses: number[] = [];

  records.forEach((r) => {
    switch (r.recordType) {
      case RecordType.TRANSACTION:
        // check transaction type
        switch (r.transactionType) {
          case TransactionType.INCOME:
            incomes.push(r.amount);
            break;
          case TransactionType.EXPENSE:
            expenses.push(r.amount);
            break;
        }
        break;
      case RecordType.PLANNED_INCOME: {
        incomes.push(r.amount);
        break;
      }
      case RecordType.PROJECT_TRANSACTION: {
        if (r.incomeSource) return; // skip allocated planned incomes
        if (r.toProjectId) {
          incomes.push(r.amount);
        }
        if (r.fromProjectId) {
          expenses.push(r.amount);
        }
      }
    }
  });

  const totalIncome = incomes.reduce((a, b) => a + b, 0);
  const totalExpense = expenses.reduce((a, b) => a + b, 0);

  return {
    totalIncome,
    totalExpense,
  };
};
