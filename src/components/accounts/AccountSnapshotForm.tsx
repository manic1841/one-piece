import { AccountAmount } from '@/components/accounts/form/AccountAmount';
import { AccountHolding } from '@/components/accounts/form/AccountHolding';
import { AccountSnapshotSelection } from '@/components/accounts/form/AccountSnapshotSelection';
import { useAccountSnapshotForm } from '@/components/accounts/form/useAccountSnapshotForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  type Account,
  type AccountSnapshot,
  type AccountSnapshotCreate,
} from '@/domains/account/types';

interface AccountSnapshotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accountId: string, snapshot: AccountSnapshotCreate) => Promise<void>;
  accounts?: Account[];
  selectedAccount?: Account;
  initialData?: AccountSnapshot;
  householdId: string;
}

export const AccountSnapshotForm: React.FC<AccountSnapshotFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accounts,
  selectedAccount,
  initialData,
  householdId,
}) => {
  const {
    loading,
    error,
    formData,
    updateFormData,
    previousAmount,
    isInvestment,
    addHolding,
    removeHolding,
    updateHolding,
    save,
  } = useAccountSnapshotForm(householdId, selectedAccount, initialData, onSubmit, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Balance' : 'Record Balance'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Account Selection */}
          <AccountSnapshotSelection
            accounts={accounts}
            formData={formData}
            previousAmount={previousAmount}
            onUpdateFormData={updateFormData}
          />

          {/* Holdings Section for Investment Accounts */}
          {isInvestment && (
            <AccountHolding
              holdings={formData.holdings}
              onAddHolding={addHolding}
              onRemoveHolding={removeHolding}
              onUpdateHolding={updateHolding}
            />
          )}

          {/* Amount */}
          <AccountAmount
            amount={formData.amount}
            setAmount={(value) => updateFormData({ amount: value })}
            readonly={isInvestment}
            currencyLabel={formData.currency ? `(${formData.currency})` : undefined}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update' : 'Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSnapshotForm;
