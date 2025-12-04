import React from 'react';
import { type Transaction, type PlannedIncome, type ProjectTransaction } from '@/schemas';
import { TransactionFormContent } from './form/TransactionFormContent';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TransactionFormProps {
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

const TransactionForm: React.FC<TransactionFormProps> = (props) => {
  const { isOpen, onClose, initialData, initialPlannedIncome, initialProjectTransaction } = props;

  const getDialogTitle = () => {
    if (initialPlannedIncome) return 'Edit Planned Income';
    if (initialData) return 'Edit Transaction';
    if (initialProjectTransaction) return 'Edit Transfer';
    // Note: We can't know if it's "Record Income & Allocate" without the hook state,
    // but "New Transaction" is a safe default for the wrapper title.
    return 'Transaction';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        <TransactionFormContent {...props} isOpen={isOpen} />
      </DialogContent>
    </Dialog>
  );
};

export default TransactionForm;
