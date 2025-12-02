import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import TransactionForm from '../components/transactions/TransactionForm';
import { type Transaction, type PlannedIncome, type ProjectTransaction } from '../schemas';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionStats } from '../components/transactions/TransactionStats';
import { TransactionList } from '../components/transactions/TransactionList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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
    updateProjectTransaction,
    deleteTransaction,
    deletePlannedIncome,
    deleteProjectTransaction,
  } = useTransactions(userProfile?.householdId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [editingPlannedIncome, setEditingPlannedIncome] = useState<PlannedIncome | undefined>();
  const [editingProjectTransaction, setEditingProjectTransaction] = useState<ProjectTransaction | undefined>();
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
    setEditingProjectTransaction(undefined);
  };

  const handleEditProjectTransaction = (pt: ProjectTransaction) => {
    setEditingProjectTransaction(pt);
    setIsFormOpen(true);
  };

  const handleUpdateProjectTransaction = async (data: Omit<ProjectTransaction, 'id' | 'createdAt' | 'createdBy'>) => {
    if (!editingProjectTransaction) return;
    await updateProjectTransaction(editingProjectTransaction.id, data);
    setEditingProjectTransaction(undefined);
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
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus size={20} />
          Add Transaction
        </Button>
      </div>

      {/* Stats Cards */}
      <TransactionStats stats={stats} />

      {/* Filter Tabs */}
      <Card>
        <CardContent className="p-2">
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'ghost'}
              className={`flex-1 ${filterType === 'all' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''
                }`}
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button
              variant={filterType === 'income' ? 'default' : 'ghost'}
              className={`flex-1 ${filterType === 'income' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''
                }`}
              onClick={() => setFilterType('income')}
            >
              Income
            </Button>
            <Button
              variant={filterType === 'expense' ? 'default' : 'ghost'}
              className={`flex-1 ${filterType === 'expense' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''
                }`}
              onClick={() => setFilterType('expense')}
            >
              Expense
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <TransactionList
        items={filteredList}
        loading={loading}
        onEditTransaction={handleEditClick}
        onEditPlannedIncome={handleEditPlannedIncome}
        onEditProjectTransaction={handleEditProjectTransaction}
        onDeleteTransaction={deleteTransaction}
        onDeletePlannedIncome={deletePlannedIncome}
        onDeleteProjectTransaction={deleteProjectTransaction}
      />

      {/* Transaction Form Modal */}
      {userProfile?.householdId && currentUser?.email && (
        <TransactionForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={editingTransaction ? handleUpdateTransaction : handleCreateTransaction}
          onSubmitPlannedIncome={handleCreatePlannedIncome}
          onUpdatePlannedIncome={editingPlannedIncome ? handleUpdatePlannedIncome : undefined}
          onUpdateProjectTransaction={
            editingProjectTransaction ? handleUpdateProjectTransaction : undefined
          }
          onSuccess={loadTransactions}
          initialData={editingTransaction}
          initialPlannedIncome={editingPlannedIncome}
          initialProjectTransaction={editingProjectTransaction}
          householdId={userProfile.householdId}
          userEmail={currentUser.email}
        />
      )}
    </div>
  );
};

export default Transactions;
