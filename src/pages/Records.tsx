import React from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import RecordForm from '@/components/records/RecordForm';
import { useRecordPage } from '@/hooks/pages/useRecordPage';
import { RecordStats } from '@/components/records/RecordStats';
import { RecordList } from '@/components/records/RecordList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RecordFilterType } from '@/domains/record/types';

const Records: React.FC = () => {
  const { userProfile, currentUser } = useAuth();
  const {
    loading,
    stats,
    reload,
    filteredRecords,
    filterType,
    setFilterType,
    openForm,
    closeForm,
    isFormOpen,
    editing,
    editClick,
    deleteClick,
    create,
    update,
  } = useRecordPage(userProfile?.householdId, userProfile?.email);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <Button onClick={openForm}>
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
              variant={filterType === RecordFilterType.ALL ? 'default' : 'ghost'}
              className={`flex-1 ${
                filterType === RecordFilterType.ALL
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : ''
              }`}
              onClick={() => setFilterType(RecordFilterType.ALL)}
            >
              All
            </Button>
            <Button
              variant={filterType === RecordFilterType.INCOME ? 'default' : 'ghost'}
              className={`flex-1 ${
                filterType === RecordFilterType.INCOME
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : ''
              }`}
              onClick={() => setFilterType(RecordFilterType.INCOME)}
            >
              Income
            </Button>
            <Button
              variant={filterType === RecordFilterType.EXPENSE ? 'default' : 'ghost'}
              className={`flex-1 ${
                filterType === RecordFilterType.EXPENSE
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : ''
              }`}
              onClick={() => setFilterType(RecordFilterType.EXPENSE)}
            >
              Expense
            </Button>
            <Button
              variant={filterType === RecordFilterType.TRANSFER ? 'default' : 'ghost'}
              className={`flex-1 ${
                filterType === RecordFilterType.TRANSFER
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : ''
              }`}
              onClick={() => setFilterType(RecordFilterType.TRANSFER)}
            >
              Transfer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <RecordList
        items={filteredRecords}
        loading={loading}
        onEdit={editClick}
        onDelete={deleteClick}
      />

      {/* Transaction Form Modal */}
      {userProfile?.householdId && currentUser?.email && (
        <RecordForm
          isOpen={isFormOpen}
          onClose={closeForm}
          onSubmit={editing ? update : create}
          onSuccess={reload}
          initialData={editing}
          householdId={userProfile.householdId}
          userEmail={currentUser.email}
        />
      )}
    </div>
  );
};

export default Records;
