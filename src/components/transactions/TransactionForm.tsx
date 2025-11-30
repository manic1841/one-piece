import React from 'react';
import { type Transaction, type PlannedIncome } from '../../schemas';
import { TransactionFormContent } from './form/TransactionFormContent';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TransactionFormProps {
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

const TransactionForm: React.FC<TransactionFormProps> = (props) => {
  const { isOpen, onClose, initialData, initialPlannedIncome } = props;

  const getDialogTitle = () => {
    if (initialPlannedIncome) return 'Edit Planned Income';
    if (initialData) return 'Edit Transaction';
    // Note: We can't know if it's "Record Income & Allocate" without the hook state,
    // but "New Transaction" is a safe default for the wrapper title.
    // The content component could potentially update the title or we accept this limitation.
    // Alternatively, we can pass a callback or context, but that adds complexity.
    // For now, let's use a generic title or infer from props if possible.
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
