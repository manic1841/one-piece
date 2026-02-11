import { useMemo } from 'react';

import { calculateRecordStats } from '@/domains/record/calculator';
import { type Record } from '@/domains/record/types';

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
