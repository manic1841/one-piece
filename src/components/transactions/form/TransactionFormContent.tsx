import React from 'react';
import { type Transaction, type PlannedIncome, type ProjectTransaction } from '../../../schemas';
import { useTransactionForm } from '../../../hooks/useTransactionForm';
import { TypeToggle } from '../TypeToggle';
import { AllocationSection } from '../AllocationSection';
import { TransactionBasicFields } from './TransactionBasicFields';
import { ProjectSelection } from './ProjectSelection';
import { AllocationButton } from './AllocationButton';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TransferSettings } from './TransferSettings';

interface TransactionFormContentProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  onSubmitPlannedIncome?: (plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>) => Promise<void>;
  onUpdatePlannedIncome?: (plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateProjectTransaction?: (
    data: Omit<ProjectTransaction, 'id' | 'createdAt' | 'createdBy'>,
  ) => Promise<void>;
  onSuccess?: () => void;
  initialData?: Transaction;
  initialPlannedIncome?: PlannedIncome;
  initialProjectTransaction?: ProjectTransaction;
  householdId: string;
  userEmail: string;
}

export const TransactionFormContent: React.FC<TransactionFormContentProps> = (props) => {
  const { onClose, initialProjectTransaction } = props;

  const {
    type,
    setType,
    amount,
    setAmount,
    category,
    setCategory,
    projectId,
    setProjectId,
    fromProjectId,
    setFromProjectId,
    toProjectId,
    setToProjectId,
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
        {!isEditingPlannedIncome && !initialProjectTransaction && (
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

        {/* Transfer: From/To Project Selection */}
        {type === 'transfer' && (
          <TransferSettings
            fromProjectId={fromProjectId}
            setFromProjectId={setFromProjectId}
            toProjectId={toProjectId}
            setToProjectId={setToProjectId}
            projects={projects}
          />
        )}

        {/* Project Selection (Expense or Income without Allocations) */}
        {(type === 'expense' || (type === 'income' && !showAllocations)) && (
          <ProjectSelection projectId={projectId} setProjectId={setProjectId} projects={projects} />
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
          取消
        </Button>
        <Button type="submit" onClick={handleSubmit} disabled={loading}>
          {loading
            ? '儲存中...'
            : isEditingPlannedIncome || initialProjectTransaction
              ? '更新'
              : showAllocations && type === 'income'
                ? '儲存並分配'
                : type === 'transfer'
                  ? '轉帳'
                  : '儲存'}
        </Button>
      </DialogFooter>
    </>
  );
};
