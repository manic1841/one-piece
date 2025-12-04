import { useState, useEffect, useCallback } from 'react';
import { type Transaction, type PlannedIncome, type ProjectTransaction } from '../schemas';
import {
  type UnifiedRecord,
  RecordType,
} from '../components/transactions/form/types/unifiedRecord';
import { unifiedRecordService } from '@/services/unifiedRecordService';

export type TransactionListItem =
  | { type: 'transaction'; data: Transaction }
  | { type: 'plannedIncome'; data: PlannedIncome }
  | { type: 'projectTransaction'; data: ProjectTransaction };

export const useTransactions = (householdId?: string, email?: string) => {
  const [combinedList, setCombinedList] = useState<UnifiedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const loadTransactions = useCallback(async () => {
    if (!householdId || !email) return;

    setLoading(true);
    try {
      const unifiedRecords = await unifiedRecordService.getUnifiedRecords(householdId);

      unifiedRecords.filter(
        (r) => r.recordType === RecordType.projectTransaction && !r.incomeSource,
      );

      setCombinedList(unifiedRecords);

      // Calculate stats from both transactions and planned incomes
      const transactionIncome = unifiedRecords
        .filter((t) => t.formType === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const transactionExpense = unifiedRecords
        .filter((t) => t.formType === 'expense')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const plannedIncome = unifiedRecords
        .filter((t) => t.formType === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const totalIncome = transactionIncome + plannedIncome;
      const totalExpense = transactionExpense;
      const balance = totalIncome - totalExpense;

      setStats({ totalIncome, totalExpense, balance });
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [householdId, email]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const createRecord = async (record: UnifiedRecord) => {
    if (!householdId || !email) return;
    await unifiedRecordService.createUnifiedRecord(householdId, record, email);
    await loadTransactions();
  };

  const updateRecord = async (record: UnifiedRecord) => {
    if (!householdId || !email || !record.id) return;
    await unifiedRecordService.updateUnifiedRecord(householdId, record.id, record, email);
    await loadTransactions();
  };

  const deleteRecord = async (record: UnifiedRecord) => {
    if (!householdId) return;

    await unifiedRecordService.deleteUnifiedRecord(householdId, record);
    await loadTransactions();
  };

  return {
    combinedList,
    loading,
    stats,
    loadTransactions,
    createRecord,
    updateRecord,
    deleteRecord,
  };
};
