import React, { useState, useEffect } from 'react';

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
import { Textarea } from '@/ui/components/ui/textarea';
import { toPortfolioForm, toPortfolioFormData } from '@/domains/portfolio/mappers';
import { type Portfolio, type PortfolioFormData } from '@/domains/portfolio/types';
import { type Account } from '@/domains/account/types/account';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';

interface PortfolioFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PortfolioFormData) => Promise<void>;
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
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const initialData = toPortfolioForm(portfolio);

  const [newName, setNewName] = useState(initialData.name);
  const [newDescription, setNewDescription] = useState(initialData.description);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(initialData.accountIds);
  const [isActive, setIsActive] = useState(initialData.isActive);
  const [initialOrder, setInitialOrder] = useState(initialData.order);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!householdId) return;
      const data = await fetchAccounts(householdId, { uid: '', email: '', isGlobalAdmin: true });
      setAvailableAccounts(data);
    };
    loadAccounts();
  }, [householdId, fetchAccounts]);

  // Reset form when portfolio changes or modal opens
  React.useEffect(() => {
    if (isOpen) {
      const data = toPortfolioForm(portfolio);
      setNewName(data.name);
      setNewDescription(data.description || '');
      setSelectedAccountIds(data.accountIds);
      setIsActive(data.isActive);
      setInitialOrder(data.order);
    }
  }, [isOpen, portfolio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    setLoading(true);
    try {
      await onSubmit(
        toPortfolioFormData(
          newName,
          newDescription || '',
          selectedAccountIds,
          isActive,
          initialOrder,
        ),
      );
      setNewName('');
      setNewDescription('');
      setSelectedAccountIds([]);
      onClose();
    } catch (error) {
      console.error('Failed to submit portfolio form:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId],
    );
  };

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
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Describe the purpose of this portfolio"
            />
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
          <div className="space-y-2">
            <Label>Linked Accounts</Label>
            <div className="border rounded-md p-3 max-h-[200px] overflow-y-auto space-y-2">
              {availableAccounts.map((account) => (
                <div key={account.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`acc-${account.id}`}
                    checked={selectedAccountIds.includes(account.id)}
                    onCheckedChange={() => toggleAccountSelection(account.id)}
                  />
                  <Label
                    htmlFor={`acc-${account.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {account.name} ({account.category})
                  </Label>
                </div>
              ))}
              {availableAccounts.length === 0 && (
                <div className="text-sm text-muted-foreground">No accounts available.</div>
              )}
            </div>
          </div>
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
