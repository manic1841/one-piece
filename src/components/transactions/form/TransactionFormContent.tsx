import React, { useState } from 'react';
import { type Transaction, type PlannedIncome, type ProjectTransaction } from '../../../schemas';
import { useTransactionForm } from '../../../hooks/useTransactionForm';
import { TypeToggle } from '../TypeToggle';
import { AllocationSection } from './AllocationSection';
import { TransactionBasicFields } from './TransactionBasicFields';
import { ProjectSelection } from './ProjectSelection';
import { AllocationButton } from './AllocationButton';
import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TransferSettings } from './TransferSettings';

type AnyRecord = Transaction | PlannedIncome | ProjectTransaction;
const RecordType = {
  transaction: 'transaction',
  plannedIncome: 'plannedIncome',
  projectTransaction: 'projectTransaction',
};
export type RecordType = (typeof RecordType)[keyof typeof RecordType];
export interface UnifiedRecord {
  recordType: RecordType;

  id: string;
  date: Date;
  amount: number;
  category?: string;
  description?: string;
  createdBy: string;
  createdAt: Date;

  // for
  // transaction.projectId,
  // projectTransaction.toProjectId
  mainProjectId?: string | null;
  // for projectTransaction.fromProjectId
  sourceProjectId?: string | null;

  // plannedIncome
  allocations?: {
    projectId: string;
    percentage: number;
  }[];
  // projectTransaction
  incomeSource?: string;
  // transaction
  transactionType?: string;
}

const normalizeRecord = (record: AnyRecord): UnifiedRecord => {
  if ('projectId' in record) {
    const txn = record as Transaction;
    return {
      id: txn.id,
      recordType: RecordType.transaction,
      date: txn.date,
      category: txn.category,
      amount: txn.amount,
      description: txn.description,
      createdBy: txn.createdBy,
      createdAt: txn.createdAt,
      mainProjectId: txn.projectId,
      transactionType: txn.type,
    };
  }
  if ('allocation' in record) {
    const income = record as PlannedIncome;
    return {
      id: income.id,
      recordType: RecordType.plannedIncome,
      date: income.date,
      category: income.category,
      amount: income.amount,
      description: income.description,
      createdBy: income.createdBy,
      createdAt: income.createdAt,

      allocations: income.allocations,
    };
  }
  if ('fromProjectId' in record) {
    const pt = record as ProjectTransaction;
    return {
      id: pt.id,
      recordType: RecordType.projectTransaction,
      date: pt.date,
      amount: pt.amount,
      description: pt.description,
      createdBy: pt.createdBy,
      createdAt: pt.createdAt,
      mainProjectId: pt.toProject,
      sourceProjectId: pt.fromProject,
      incomeSource: pt.incomeSource,
    };
  }

  throw new Error('Invalid record type');
};

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
  initialDataNew?: AnyRecord;
  householdId: string;
  userEmail: string;
}

export const TransactionFormContent: React.FC<TransactionFormContentProps> = (props) => {
  const { onClose, initialProjectTransaction } = props;
  const [showAllocations, setShowAllocations] = useState(false);

  const initialData =
    props.initialDataNew ||
    props.initialData ||
    props.initialPlannedIncome ||
    props.initialProjectTransaction;
  const normalizedInitialData = initialData ? normalizeRecord(initialData) : null;

  const [formData, setFormData] = useState(normalizedInitialData);
  const isEditing = !!formData;

  const handleFormChanged = (name: keyof UnifiedRecord, value: string | Date | number) => {
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const {
    type,
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
        {!isEditing && <TypeToggle type={type} onChanged={handleFormChanged} />}

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
