import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import TransactionForm from '../components/TransactionForm';
import { type Transaction, type PlannedIncome } from '../schemas';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionStats } from '../components/transactions/TransactionStats';
import { TransactionList } from '../components/transactions/TransactionList';

const Transactions: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const {
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
  } = useTransactions(userProfile?.householdId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [editingPlannedIncome, setEditingPlannedIncome] = useState<PlannedIncome | undefined>();
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const handleCreateTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    await createTransaction(transaction);
  };

  const handleCreatePlannedIncome = async (
    plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>,
  ) => {
    await createPlannedIncome(plannedIncome);
  };

  const handleUpdateTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!editingTransaction) return;
    await updateTransaction(editingTransaction.id, transaction);
    setEditingTransaction(undefined);
  };

  const handleUpdatePlannedIncome = async (
    plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>,
  ) => {
    if (!editingPlannedIncome) return;
    await updatePlannedIncome(editingPlannedIncome.id, plannedIncome);
    setEditingPlannedIncome(undefined);
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
      <TransactionStats stats={stats} />

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2 flex gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            filterType === 'all' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('income')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            filterType === 'income'
              ? 'bg-green-100 text-green-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Income
        </button>
        <button
          onClick={() => setFilterType('expense')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
            filterType === 'expense' ? 'bg-red-100 text-red-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Expense
        </button>
      </div>

      {/* Transactions List */}
      <TransactionList
        items={filteredList}
        loading={loading}
        onEditTransaction={handleEditClick}
        onEditPlannedIncome={handleEditPlannedIncome}
        onDeleteTransaction={deleteTransaction}
        onDeletePlannedIncome={deletePlannedIncome}
      />

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
