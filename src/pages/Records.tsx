import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import RecordForm from '../components/records/RecordForm';
import { useRecordPage } from './hooks/useRecordPage';
import { RecordStats } from '../components/records/RecordStats';
import { RecordList } from '../components/records/RecordList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { type Record } from '@/domains/record/record';

const Records: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const { records, loading, stats, loadRecords, createRecord, updateRecord, deleteRecord } =
    useRecordPage(userProfile?.householdId, userProfile?.email);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [edit, setEdit] = useState<Record | undefined>(undefined);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  const handleCreate = async (record: Record) => {
    await createRecord(record);
  };

  const handleUpdate = async (record: Record) => {
    if (!edit) return;
    await updateRecord(record);
    setEdit(undefined);
  };

  const handleEditClick = (record: Record) => {
    setEdit(record);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (record: Record) => {
    deleteRecord(record);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEdit(undefined);
  };

  const filteredList = records.filter((item) => {
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
      <RecordStats stats={stats} />

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
      <RecordList
        items={filteredList}
        loading={loading}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* Transaction Form Modal */}
      {userProfile?.householdId && currentUser?.email && (
        <RecordForm
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          onSubmit={edit ? handleUpdate : handleCreate}
          onSuccess={loadRecords}
          initialData={edit}
          householdId={userProfile.householdId}
          userEmail={currentUser.email}
        />
      )}
    </div>
  );
};

export default Records;
