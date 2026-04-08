import React, { useState, useEffect } from 'react';
import { type Account, type AccountType } from '../../schemas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (account: Omit<Account, 'id' | 'snapshots' | 'createdAt'>) => Promise<void>;
  initialData?: Account;
  householdId: string;
  userEmail: string;
}

const accountTypes: { value: AccountType; label: string; icon: string }[] = [
  { value: 'bank', label: 'Bank Account', icon: '🏦' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'investment', label: 'Investment', icon: '📈' },
  { value: 'other', label: 'Other', icon: '📦' },
];

const AccountForm: React.FC<AccountFormProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [type, setType] = useState<AccountType>(initialData?.type || 'bank');
  const [currency, setCurrency] = useState(initialData?.currency || 'USD');
  const [includeInReconciliation, setIncludeInReconciliation] = useState(
    initialData?.includeInReconciliation ?? true,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setType(initialData.type);
      setCurrency(initialData.currency);
      setIncludeInReconciliation(initialData.includeInReconciliation ?? true);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter an account name');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        name: name.trim(),
        type,
        currency,
        includeInReconciliation,
      });

      // Reset form
      setName('');
      setType('bank');
      setCurrency('USD');
      setIncludeInReconciliation(true);
      onClose();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to save account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Account' : 'New Account'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Account Type */}
          <div className="space-y-2">
            <Label>Account Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {accountTypes.map((accountType) => (
                <Button
                  key={accountType.value}
                  type="button"
                  variant={type === accountType.value ? 'default' : 'outline'}
                  onClick={() => setType(accountType.value)}
                  className="justify-start gap-2"
                >
                  <span className="text-xl">{accountType.icon}</span>
                  <span className="text-sm font-medium">{accountType.label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="TWD">TWD (NT$)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="JPY">JPY (¥)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include in Reconciliation */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-reconciliation"
              checked={includeInReconciliation}
              onCheckedChange={(checked) => setIncludeInReconciliation(checked === true)}
            />
            <Label
              htmlFor="include-reconciliation"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include in reconciliation
            </Label>
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
