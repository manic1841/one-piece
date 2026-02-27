import { type Record, RecordFilterType, RecordType, TransactionType } from '@/domains/record/types';

export const filterRecords = (records: Record[], filters: RecordFilterType) => {
  // exclude records with incomeSource (allocated planned incomes)
  const filterRecords = records.filter((r) => {
    return !r.incomeSource;
  });

  // income
  if (filters === RecordFilterType.INCOME) {
    return filterRecords.filter((r) => {
      return (
        r.recordType === RecordType.PLANNED_INCOME ||
        (r.recordType === RecordType.TRANSACTION && r.transactionType === TransactionType.INCOME)
      );
    });
  }

  // expense
  if (filters === RecordFilterType.EXPENSE) {
    return filterRecords.filter((r) => {
      return (
        r.recordType === RecordType.TRANSACTION && r.transactionType === TransactionType.EXPENSE
      );
    });
  }

  // transfer
  if (filters === RecordFilterType.TRANSFER) {
    return filterRecords.filter((r) => {
      return r.recordType === RecordType.PROJECT_TRANSACTION;
    });
  }

  // all
  return filterRecords;
};
