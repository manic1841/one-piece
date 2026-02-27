import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAccounts } from '@/hooks/useAccounts';
import { type PortfolioCreate } from '@/schemas';

interface PortfolioFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PortfolioCreate) => Promise<void>;
  householdId: string;
}

const PortfolioForm: React.FC<PortfolioFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  householdId,
}) => {
  const { accounts: availableAccounts } = useAccounts(householdId);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    setLoading(true);
    try {
      await onSubmit({
        name: newName,
        description: newDescription,
        accountIds: selectedAccountIds,
        isActive: true,
      });
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
          <DialogTitle>Create Portfolio</DialogTitle>
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
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioForm;
