import { useMemo } from 'react';
import { type Record } from '@/domains/record/types';
import { calculateRecordStats } from '@/domains/record/calculator';

export const useRecordStats = (records: Record[]) => {
  return useMemo(() => {
    const { totalIncome, totalExpense } = calculateRecordStats(records);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [records]);
};
