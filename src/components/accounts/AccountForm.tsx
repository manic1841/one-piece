import { useAccountForm } from '@/components/accounts/useAccountForm';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccountCategoryIcons } from '@/constants/account/icon';
import { AccountCategoryLabels } from '@/constants/account/label';
import { CurrencyOptions } from '@/constants/account/label';
import { AccountCategory } from '@/domains/account/types';
import { type Account } from '@/domains/account/types';
import type { AccountArgs } from '@/hooks/pages/useAccountPage';

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (args: AccountArgs) => Promise<void>;
  initialData?: Account;
  householdId: string;
  userEmail: string;
}

const AccountForm: React.FC<AccountFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const { loading, error, formData, save, updateFormData } = useAccountForm(
    initialData,
    onSubmit,
    onClose,
    isOpen,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Account' : 'New Account'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={save} className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="account-name">Account Name</Label>
            <Input
              id="account-name"
              type="text"
              required
              placeholder="e.g., Main Bank Account"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
            />
          </div>

          {/* Account Category */}
          <div className="space-y-2">
            <Label>Account Category</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(AccountCategory).map(([key, value]) => (
                <Button
                  key={key}
                  type="button"
                  variant={formData.category === value ? 'default' : 'outline'}
                  onClick={() => updateFormData({ category: value })}
                  className="justify-start gap-2"
                >
                  <span className="text-xl">{AccountCategoryIcons[value]}</span>
                  <span className="text-sm font-medium">{AccountCategoryLabels[value]}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select
              value={formData?.currency}
              onValueChange={(value) => updateFormData({ currency: value })}
            >
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CurrencyOptions.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountForm;
