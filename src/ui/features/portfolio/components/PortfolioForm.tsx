import React, { useEffect, useState } from 'react';

import {
  AccountCategory,
  type Account,
  type Portfolio,
} from '@/ui/features/portfolio/viewmodels/portfolioForm.vm';
import { Button } from '@/ui/components/ui/button';
import { Checkbox } from '@/ui/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import {
  type PortfolioFormVM,
  mapPortfolioToFormVM,
  parsePortfolioFormVM,
} from '@/ui/features/portfolio/viewmodels/portfolioForm.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

interface PortfolioFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PortfolioFormVM) => Promise<void>;
  householdId: string;
  portfolio?: Portfolio;
}

const PortfolioForm: React.FC<PortfolioFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  householdId,
  portfolio,
}) => {
  const { fetchAccounts } = useAccounts();
  const auth = useAuthIdentity();
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const initialData = mapPortfolioToFormVM(portfolio);

  const [newName, setNewName] = useState(initialData.name);
  const [securitiesAccountId, setSecuritiesAccountId] = useState(initialData.securitiesAccountId);
  const [bankAccountId, setBankAccountId] = useState(initialData.bankAccountId);
  const [isActive, setIsActive] = useState(initialData.isActive);
  const [initialOrder, setInitialOrder] = useState(initialData.order);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!householdId) return;
      const result = await fetchAccounts(
        householdId,
        auth,
        { includeInactive: true },
      );
      setAvailableAccounts(result.ok ? result.value : []);
    };
    loadAccounts();
  }, [householdId, fetchAccounts, auth]);

  // Reset form when portfolio changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      const data = mapPortfolioToFormVM(portfolio);
      setNewName(data.name);
      setSecuritiesAccountId(data.securitiesAccountId);
      setBankAccountId(data.bankAccountId);
      setIsActive(data.isActive);
      setInitialOrder(data.order);
    }
  }, [isOpen, portfolio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    setLoading(true);
    try {
      const vm = parsePortfolioFormVM({
        name: newName,
        securitiesAccountId,
        bankAccountId,
        isActive,
        order: initialOrder,
      });
      await onSubmit(vm);
      setNewName('');
      setSecuritiesAccountId('');
      setBankAccountId('');
      onClose();
    } catch (error) {
      console.error('Failed to submit portfolio form:', error);
    } finally {
      setLoading(false);
    }
  };

  const securitiesAccounts = availableAccounts.filter(
    (account) => account.category === AccountCategory.SECURITIES,
  );
  const bankAccounts = availableAccounts.filter(
    (account) =>
      account.category === AccountCategory.BANK || account.category === AccountCategory.CASH,
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{portfolio ? 'Edit Portfolio' : 'Create Portfolio'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Retirement Fund"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="securities-account">Securities Account</Label>
            <select
              id="securities-account"
              className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm"
              value={securitiesAccountId}
              onChange={(e) => setSecuritiesAccountId(e.target.value)}
              required
            >
              <option value="">Select securities account</option>
              {securitiesAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-account">Bank Account</Label>
            <select
              id="bank-account"
              className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm"
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              required
            >
              <option value="">Select bank account</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.category})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(!!checked)}
            />
            <Label htmlFor="active" className="text-sm font-normal cursor-pointer">
              Active
            </Label>
          </div>
          {portfolio && (
            <p className="text-xs text-muted-foreground">帳戶連結建立後不可變更</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : portfolio ? 'Save Changes' : 'Create Portfolio'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioForm;
