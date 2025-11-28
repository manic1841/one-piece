import React, { useState, useEffect, useCallback } from 'react';
import { type Account, type AccountSnapshot } from '../../schemas';
import { accountService } from '../../services/accountService';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';

interface AccountSnapshotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (snapshot: Omit<AccountSnapshot, 'id' | 'createdAt'>) => Promise<void>;
  accounts: Account[];
  userEmail: string;
  initialAccountId?: string;
  householdId: string;
}

const AccountSnapshotForm: React.FC<AccountSnapshotFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accounts,
  userEmail,
  initialAccountId,
  householdId,
}) => {
  const currentDate = new Date();
  const [accountId, setAccountId] = useState(initialAccountId || '');
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previousAmount, setPreviousAmount] = useState<number | null>(null);

  const loadPreviousAmount = useCallback(async () => {
    if (!accountId) return;

    try {
      // Get previous month's snapshot
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = year - 1;
      }

      const snapshots = await accountService.getSnapshots(
        householdId,
        accountId,
        prevYear,
        prevMonth,
      );
      if (snapshots.length > 0) {
        setPreviousAmount(snapshots[0].amount);
      } else {
        setPreviousAmount(null);
      }
    } catch (err) {
      console.error('Failed to load previous amount:', err);
      setPreviousAmount(null);
    }
  }, [householdId, accountId, year, month]);

  useEffect(() => {
    if (initialAccountId) {
      setAccountId(initialAccountId);
    }
  }, [initialAccountId]);

  useEffect(() => {
    if (accountId && year && month) {
      loadPreviousAmount();
    }
  }, [accountId, year, month, loadPreviousAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!accountId) {
      setError('Please select an account');
      return;
    }

    if (!amount || parseFloat(amount) < 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      await onSubmit({
        year,
        month,
        amount: parseFloat(amount),
        createdBy: userEmail,
      });

      // Reset form
      setAccountId('');
      setAmount('');
      setPreviousAmount(null);
      onClose();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to record snapshot');
    } finally {
      setLoading(false);
    }
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Balance</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Account Selection */}
          <div className="space-y-2">
            <Label htmlFor="account">Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="account">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year & Month */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                required
                min="2000"
                max="2100"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
                <SelectTrigger id="month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Previous Balance Reference */}
          {previousAmount !== null && selectedAccount && (
            <Card className="bg-blue-50 border-blue-200 p-3">
              <p className="text-sm text-blue-700">
                Previous month's balance:{' '}
                <span className="font-semibold">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: selectedAccount.currency,
                  }).format(previousAmount)}
                </span>
              </p>
            </Card>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Balance {selectedAccount && `(${selectedAccount.currency})`}
            </Label>
            <Input
              id="amount"
              type="number"
              required
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Record'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSnapshotForm;
