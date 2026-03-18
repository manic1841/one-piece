import React, { useState } from 'react';

import { Plus } from 'lucide-react';

import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import { useProjects } from '@/ui/features/project/hooks/useProjects';
import { TransactionList } from '@/ui/features/transaction/components/TransactionList';
import { TransactionForm } from '@/ui/features/transaction/components/form/TransactionForm';
import { useTransactions } from '@/ui/features/transaction/hooks/useTransactions';

const Transactions: React.FC = () => {
  const { userProfile } = useAuth();
  const { transactions, loading, reload } = useTransactions(userProfile?.householdId);
  const { projects } = useProjects(userProfile?.householdId);
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">交易</h1>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新增交易
        </Button>
      </div>

      <TransactionList items={transactions} loading={loading} projects={projects} />

      {userProfile?.householdId && (
        <TransactionForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => reload()}
          householdId={userProfile.householdId}
        />
      )}
    </div>
  );
};

export default Transactions;
