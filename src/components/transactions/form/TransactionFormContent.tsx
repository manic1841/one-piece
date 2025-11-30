import React from 'react';
import { type Transaction, type PlannedIncome } from '../../../schemas';
import { useTransactionForm } from '../../../hooks/useTransactionForm';
import { TypeToggle } from '../TypeToggle';
import { AllocationSection } from '../AllocationSection';
import { TransactionBasicFields } from './TransactionBasicFields';
import { ProjectSelection } from './ProjectSelection';
import { AllocationButton } from './AllocationButton';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TransactionFormContentProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  onSubmitPlannedIncome?: (plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>) => Promise<void>;
  onUpdatePlannedIncome?: (plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>) => Promise<void>;
  onSuccess?: () => void;
  initialData?: Transaction;
  initialPlannedIncome?: PlannedIncome;
  householdId: string;
  userEmail: string;
}

export const TransactionFormContent: React.FC<TransactionFormContentProps> = (props) => {
  const { onClose } = props;

  const {
    type,
    setType,
    amount,
    setAmount,
    category,
    setCategory,
    projectId,
    setProjectId,
    date,
    setDate,
    description,
    setDescription,
    projects,
    allocations,
    setAllocations,
    showAllocations,
    setShowAllocations,
    loading,
    error,
    handleAllocationChange,
    handleSubmit,
    totalPercentage,
    isEditingPlannedIncome,
  } = useTransactionForm(props);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Type Toggle */}
        {!isEditingPlannedIncome && (
          <TypeToggle
            type={type}
            setType={setType}
            setCategory={setCategory}
            setShowAllocations={setShowAllocations}
          />
        )}

        <TransactionBasicFields
          type={type}
          amount={amount}
          setAmount={setAmount}
          category={category}
          setCategory={setCategory}
          date={date}
          setDate={setDate}
          description={description}
          setDescription={setDescription}
        />

        {/* Project Selection (Expense or Income without Allocations) */}
        {(type === 'expense' || (type === 'income' && !showAllocations)) && (
          <ProjectSelection
            projectId={projectId}
            setProjectId={setProjectId}
            projects={projects}
          />
        )}

        {/* Allocate Button (Income Only) */}
        {type === 'income' && !isEditingPlannedIncome && (
          <AllocationButton
            showAllocations={showAllocations}
            setShowAllocations={setShowAllocations}
            allocationsLength={allocations.length}
            setAllocations={setAllocations}
            projects={projects}
          />
        )}

        {/* Allocations Section */}
        {(showAllocations || isEditingPlannedIncome) && type === 'income' && (
          <AllocationSection
            projects={projects}
            allocations={allocations}
            amount={amount}
            handleAllocationChange={handleAllocationChange}
            totalPercentage={totalPercentage}
          />
        )}
      </form>

      {/* Actions */}
      <DialogFooter className="border-t pt-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" onClick={handleSubmit} disabled={loading}>
          {loading
            ? 'Saving...'
            : isEditingPlannedIncome
              ? 'Update'
              : showAllocations && type === 'income'
                ? 'Save & Allocate'
                : 'Save'}
        </Button>
      </DialogFooter>
    </>
  );
};
