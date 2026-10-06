import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import { DebtAccountForm } from '@/ui/features/debt/components/DebtAccountForm';
import { type DebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';

interface DebtAccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  vm: DebtAccountFormViewModel;
}

export const DebtAccountFormDialog = ({
  open,
  onOpenChange,
  title,
  vm,
}: DebtAccountFormDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <DebtAccountForm vm={vm} />
    </DialogContent>
  </Dialog>
);
