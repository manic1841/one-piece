import { useState, useEffect, useCallback } from 'react';
import { transactionService } from '../services/transactionService';
import { plannedIncomeService } from '../services/plannedIncomeService';
import { projectTransactionService } from '../services/projectTransactionService';
import { type Transaction, type PlannedIncome, type ProjectTransaction } from '../schemas';
import { toDate } from '../utils/dateUtils';

export type TransactionListItem =
  | { type: 'transaction'; data: Transaction }
  | { type: 'plannedIncome'; data: PlannedIncome }
  | { type: 'projectTransaction'; data: ProjectTransaction };

export const useTransactions = (householdId?: string) => {
  const [combinedList, setCombinedList] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });

  const loadTransactions = useCallback(async () => {
    if (!householdId) return;

    setLoading(true);
    try {
      const [transactionsData, plannedIncomesData, projectTransactionsData] = await Promise.all([
        transactionService.getTransactions(householdId),
        plannedIncomeService.getPlannedIncomes(householdId),
        projectTransactionService.getProjectTransactions(householdId),
      ]);

      // Filter out projectTransactions with incomeSource (created from plannedIncome)
      const filteredProjectTx = projectTransactionsData.filter((pt) => !pt.incomeSource);

      // Combine transactions, plannedIncomes, and projectTransactions into a single list
      const combined: TransactionListItem[] = [
        ...transactionsData.map((t): TransactionListItem => ({ type: 'transaction', data: t })),
        ...plannedIncomesData.map(
          (pi): TransactionListItem => ({ type: 'plannedIncome', data: pi }),
        ),
        ...filteredProjectTx.map(
          (pt): TransactionListItem => ({ type: 'projectTransaction', data: pt }),
        ),
      ];

      // Sort by date (newest first)
      combined.sort((a, b) => {
        const dateA = a.type === 'transaction' ? toDate(a.data.date) : toDate(a.data.date);
        const dateB = b.type === 'transaction' ? toDate(b.data.date) : toDate(b.data.date);
        return dateB.getTime() - dateA.getTime();
      });

      setCombinedList(combined);

      // Calculate stats from both transactions and planned incomes
      const transactionIncome = transactionsData
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const transactionExpense = transactionsData
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      const plannedIncome = plannedIncomesData.reduce((sum, pi) => sum + pi.amount, 0);

      const totalIncome = transactionIncome + plannedIncome;
      const totalExpense = transactionExpense;
      const balance = totalIncome - totalExpense;

      setStats({ totalIncome, totalExpense, balance });
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const createTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!householdId) return;
    await transactionService.createTransaction(householdId, transaction);
    await loadTransactions();
  };

  const createPlannedIncome = async (plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>) => {
    if (!householdId) return;
    await plannedIncomeService.createPlannedIncome(householdId, plannedIncome);
    await loadTransactions();
  };

  const updateTransaction = async (
    id: string,
    transaction: Omit<Transaction, 'id' | 'createdAt'>,
  ) => {
    if (!householdId) return;
    await transactionService.updateTransaction(householdId, id, transaction);
    await loadTransactions();
  };

  const updatePlannedIncome = async (
    id: string,
    plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>,
  ) => {
    if (!householdId) return;
    await plannedIncomeService.updatePlannedIncome(householdId, id, plannedIncome);
    await loadTransactions();
  };

  const deleteTransaction = async (id: string) => {
    if (!householdId) return;
    await transactionService.deleteTransaction(householdId, id);
    await loadTransactions();
  };

  const deletePlannedIncome = async (id: string) => {
    if (!householdId) return;
    await plannedIncomeService.deletePlannedIncome(householdId, id);
    await loadTransactions();
  };

  const updateProjectTransaction = async (
    id: string,
    data: Partial<Omit<ProjectTransaction, 'id' | 'createdAt' | 'createdBy'>>,
  ) => {
    if (!householdId) return;
    await projectTransactionService.updateProjectTransaction(householdId, id, data);
    await loadTransactions();
  };

  const deleteProjectTransaction = async (id: string) => {
    if (!householdId) return;
    await projectTransactionService.deleteProjectTransactions(householdId, [id]);
    await loadTransactions();
  };

  return {
    combinedList,
    loading,
    stats,
    loadTransactions,
    createTransaction,
    createPlannedIncome,
    updateTransaction,
    updatePlannedIncome,
    deleteTransaction,
    deletePlannedIncome,
    updateProjectTransaction,
    deleteProjectTransaction,
  };
};
