import React from 'react';
import { TransactionFormContent } from './form/TransactionFormContent';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type UnifiedRecord } from './form/types/unifiedRecord';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: UnifiedRecord) => Promise<void>;
  onSuccess?: () => void;
  initialData?: UnifiedRecord;
  householdId: string;
  userEmail: string;
}

const TransactionForm: React.FC<TransactionFormProps> = (props) => {
  const { isOpen, onClose, initialData } = props;
  const getDialogTitle = () => {
    if (initialData) return 'Edit Transaction';
    return 'Transaction';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        <TransactionFormContent {...props} isOpen={isOpen} />
      </DialogContent>
    </Dialog>
  );
};

export default TransactionForm;
