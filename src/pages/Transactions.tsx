import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import TransactionForm from '../components/transactions/TransactionForm';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionStats } from '../components/transactions/TransactionStats';
import { TransactionList } from '../components/transactions/TransactionList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type UnifiedRecord } from '@/components/transactions/form/types/unifiedRecord';

const Transactions: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const {
    combinedList,
    loading,
    stats,
    loadTransactions,
    createRecord,
    updateRecord,
    deleteRecord,
  } = useTransactions(userProfile?.householdId, userProfile?.email);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [edit, setEdit] = useState<UnifiedRecord | undefined>(undefined);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const handleCreate = async (record: UnifiedRecord) => {
    await createRecord(record);
  };

  const handleUpdate = async (record: UnifiedRecord) => {
    if (!edit) return;
    await updateRecord(record);
    setEdit(undefined);
  };

  const handleEditClick = (record: UnifiedRecord) => {
    setEdit(record);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (record: UnifiedRecord) => {
    deleteRecord(record);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEdit(undefined);
  };

  const filteredList = combinedList.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'income') {
      return (
        item.recordType === 'plannedIncome' ||
        (item.recordType === 'transaction' && item.transactionType === 'income')
      );
    }
    if (filterType === 'expense') {
      return item.recordType === 'transaction' && item.transactionType === 'expense';
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
              className={`flex-1 ${
                filterType === 'all' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : ''
              }`}
              onClick={() => setFilterType('all')}
            >
              All
            </Button>
            <Button
              variant={filterType === 'income' ? 'default' : 'ghost'}
              className={`flex-1 ${
                filterType === 'income' ? 'bg-green-100 text-green-700 hover:bg-green-200' : ''
              }`}
              onClick={() => setFilterType('income')}
            >
              Income
            </Button>
            <Button
              variant={filterType === 'expense' ? 'default' : 'ghost'}
              className={`flex-1 ${
                filterType === 'expense' ? 'bg-red-100 text-red-700 hover:bg-red-200' : ''
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
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* Transaction Form Modal */}
      {userProfile?.householdId && currentUser?.email && (
        <TransactionForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={edit ? handleUpdate : handleCreate}
          onSuccess={loadTransactions}
          initialData={edit}
          householdId={userProfile.householdId}
          userEmail={currentUser.email}
        />
      )}
    </div>
  );
};

export default Transactions;
