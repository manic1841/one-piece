import { useMemo } from 'react';
import { type Record } from '@/domains/record/record';

export const useRecordStats = (records: Record[]) => {
  return useMemo(() => {
    const incomes = records.filter((r) => r.formType === 'income');
    const expenses = records.filter((r) => r.formType === 'expense');

    const totalIncome = incomes.reduce((a, b) => a + Number(b.amount), 0);
    const totalExpense = expenses.reduce((a, b) => a + Number(b.amount), 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
    };
  }, [records]);
};
