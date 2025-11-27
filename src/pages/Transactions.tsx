import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { transactionService } from '../services/transactionService';
import { plannedIncomeService } from '../services/plannedIncomeService';
import TransactionForm from '../components/TransactionForm';
import { type Transaction, type PlannedIncome } from '../schemas';
import { Timestamp } from 'firebase/firestore';
import { toDate } from '../utils/dateUtils';
import { formatCurrency } from '../utils/formatUtils';

// Combined type for display
type TransactionListItem =
  | { type: 'transaction'; data: Transaction }
  | { type: 'plannedIncome'; data: PlannedIncome };

const Transactions: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const [combinedList, setCombinedList] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [editingPlannedIncome, setEditingPlannedIncome] = useState<PlannedIncome | undefined>();
  const [stats, setStats] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const loadTransactions = useCallback(async () => {
    if (!userProfile?.householdId) return;

    setLoading(true);
    try {
      const [transactionsData, plannedIncomesData] = await Promise.all([
        transactionService.getTransactions(userProfile.householdId),
        plannedIncomeService.getPlannedIncomes(userProfile.householdId),
      ]);

      // Combine transactions and plannedIncomes into a single list
      const combined: TransactionListItem[] = [
        ...transactionsData.map((t): TransactionListItem => ({ type: 'transaction', data: t })),
        ...plannedIncomesData.map(
          (pi): TransactionListItem => ({ type: 'plannedIncome', data: pi }),
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
  }, [userProfile?.householdId]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleCreateTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!userProfile?.householdId) return;

    await transactionService.createTransaction(userProfile.householdId, transaction);
    await loadTransactions();
  };

  const handleCreatePlannedIncome = async (
    plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>,
  ) => {
    if (!userProfile?.householdId) return;

    await plannedIncomeService.createPlannedIncome(userProfile.householdId, plannedIncome);
    await loadTransactions();
  };

  const handleUpdateTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!editingTransaction || !userProfile?.householdId) return;

    await transactionService.updateTransaction(
      userProfile.householdId,
      editingTransaction.id,
      transaction,
    );
    setEditingTransaction(undefined);
    await loadTransactions();
  };

  const handleUpdatePlannedIncome = async (
    plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>,
  ) => {
    if (!editingPlannedIncome || !userProfile?.householdId) return;

    await plannedIncomeService.updatePlannedIncome(
      userProfile.householdId,
      editingPlannedIncome.id,
      plannedIncome,
    );
    setEditingPlannedIncome(undefined);
    await loadTransactions();
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!userProfile?.householdId) return;
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;

    await transactionService.deleteTransaction(userProfile.householdId, id);
    await loadTransactions();
  };

  const handleDeletePlannedIncome = async (id: string) => {
    if (!userProfile?.householdId) return;
    if (
      !window.confirm(
        'Are you sure you want to delete this planned income? Note: Associated project allocations will not be deleted.',
      )
    )
      return;

    await plannedIncomeService.deletePlannedIncome(userProfile.householdId, id);
    await loadTransactions();
  };

  const handleEditClick = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleEditPlannedIncome = (income: PlannedIncome) => {
    setEditingPlannedIncome(income);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(undefined);
    setEditingPlannedIncome(undefined);
  };

  const filteredList = combinedList.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'income') {
      return (
        item.type === 'plannedIncome' ||
        (item.type === 'transaction' && item.data.type === 'income')
      );
    }
    if (filterType === 'expense') {
      return item.type === 'transaction' && item.data.type === 'expense';
    }
    return true;
  });

  const formatDate = (timestamp: Timestamp | Date) => {
    if (!timestamp) return '';
    const date = toDate(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={20} />
          Add Transaction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Income</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalIncome)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="text-red-600" size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Expense</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.totalExpense)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-lg ${stats.balance >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}
            >
              <TrendingUp
                className={stats.balance >= 0 ? 'text-blue-600' : 'text-orange-600'}
                size={24}
              />
            </div>
            <div>
              <p className="text-sm text-gray-600">Balance</p>
              <p
                className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-gray-900' : 'text-orange-600'}`}
              >
                {formatCurrency(stats.balance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${filterType === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('income')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${filterType === 'income'
            ? 'bg-green-100 text-green-700'
            : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          Income
        </button>
        <button
          onClick={() => setFilterType('expense')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${filterType === 'expense' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
        >
          Expense
        </button>
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading transactions...</div>
        ) : filteredList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No transactions found. Click "Record Income" or "Add Expense" to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredList.map((item) => {
              if (item.type === 'plannedIncome') {
                const income = item.data;
                return (
                  <div
                    key={`income-${income.id}`}
                    className="p-4 hover:bg-gray-50 transition-colors bg-green-50/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 capitalize">
                                {income.category.replace('_', ' ')}
                              </p>
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                Planned Income
                              </span>
                            </div>
                            {income.description && (
                              <p className="text-sm text-gray-500">{income.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{formatDate(income.date)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-lg font-bold text-green-600">
                          +{formatCurrency(income.amount)}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPlannedIncome(income)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDeletePlannedIncome(income.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              } else {
                const transaction = item.data;
                return (
                  <div
                    key={`transaction-${transaction.id}`}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                          />
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {transaction.category.replace('_', ' ')}
                            </p>
                            {transaction.description && (
                              <p className="text-sm text-gray-500">{transaction.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                              {formatDate(transaction.date)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p
                          className={`text-lg font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditClick(transaction)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Transaction Form Modal */}
      {userProfile?.householdId && currentUser?.email && (
        <TransactionForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}
          onSubmitPlannedIncome={handleCreatePlannedIncome}
          onUpdatePlannedIncome={editingPlannedIncome ? handleUpdatePlannedIncome : undefined}
          onSuccess={loadTransactions}
          initialData={editingTransaction}
          initialPlannedIncome={editingPlannedIncome}
          householdId={userProfile.householdId}
          userEmail={currentUser.email}
        />
      )}
    </div>
  );
};

export default Transactions;
