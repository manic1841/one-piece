import React, { useState } from 'react';

import { Plus } from 'lucide-react';

import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import { useProjects } from '@/ui/features/project/hooks/useProjects';
import { TransactionList } from '@/ui/features/transaction/components/TransactionList';
import { useTransactionForm } from '@/ui/features/transaction/components/form/useTransactionForm';
import { useTransactions } from '@/ui/features/transaction/hooks/useTransactions';

import { TransactionForm } from '../components/form/TransactionForm';

const Transactions: React.FC = () => {
  const { userProfile } = useAuth();
  const { transactions, loading, reload } = useTransactions(userProfile?.householdId);
  const { projects } = useProjects(userProfile?.householdId);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const {
    expenseCategories,
    incomeCategories,
    investmentCategories,
    financingCategories,
    advancedCategories,
    loading: formSubmitting,
    error: formError,
    handleSubmit,
  } = useTransactionForm(
    userProfile?.householdId || '',
    () => setIsFormOpen(false),
    () => reload(),
  );

  const projectOptions = projects
    .filter((project) => project.isActive)
    .map((project) => ({
      id: project.id,
      name: project.name,
      icon: project.icon,
    }));

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

      {userProfile?.householdId && isFormOpen && (
        <TransactionForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmit}
          loading={formSubmitting}
          error={formError}
          projects={projectOptions}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          investmentCategories={investmentCategories}
          financingCategories={financingCategories}
          advancedCategories={advancedCategories}
        />
      )}
    </div>
  );
};

export default Transactions;
