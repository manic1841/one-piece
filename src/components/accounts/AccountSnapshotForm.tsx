import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
import { Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import {
  type Account,
  type AccountSnapshot,
  type AccountSnapshotCreate,
  type Holding,
} from '../../schemas';
import { accountService } from '../../services/accountService';

interface AccountSnapshotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (accountId: string, snapshot: AccountSnapshotCreate) => Promise<void>;
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
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previousAmount, setPreviousAmount] = useState<number | null>(null);

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isInvestment = selectedAccount?.type === 'investment';

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

  // Update amount when holdings change for investment accounts
  useEffect(() => {
    if (isInvestment) {
      const totalValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
      setAmount(totalValue.toString());
    }
  }, [holdings, isInvestment]);

  const handleAddHolding = () => {
    setHoldings([...holdings, { symbol: '', name: '', quantity: 0, marketValue: 0 }]);
  };

  const handleRemoveHolding = (index: number) => {
    const newHoldings = [...holdings];
    newHoldings.splice(index, 1);
    setHoldings(newHoldings);
  };

  const handleHoldingChange = (index: number, field: keyof Holding, value: string | number) => {
    const newHoldings = [...holdings];
    newHoldings[index] = { ...newHoldings[index], [field]: value };
    setHoldings(newHoldings);
  };

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
        holdings: isInvestment ? holdings : undefined,
        createdBy: userEmail,
      });

      // Reset form
      setAccountId('');
      setAmount('');
      setHoldings([]);
      setPreviousAmount(null);
      onClose();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to record snapshot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
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

          {/* Holdings Section for Investment Accounts */}
          {isInvestment && (
            <div className="space-y-3 border rounded-md p-4 bg-slate-50">
              <div className="flex justify-between items-center">
                <Label>Holdings</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddHolding}>
                  <Plus className="h-4 w-4 mr-1" /> Add Holding
                </Button>
              </div>

              {holdings.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No holdings added. Total value will be 0.
                </p>
              )}

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {holdings.map((holding, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-2 items-end border-b pb-2 last:border-0"
                  >
                    <div className="col-span-3">
                      <Label className="text-xs">Symbol</Label>
                      <Input
                        value={holding.symbol}
                        onChange={(e) => handleHoldingChange(index, 'symbol', e.target.value)}
                        placeholder="AAPL"
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={holding.name}
                        onChange={(e) => handleHoldingChange(index, 'name', e.target.value)}
                        placeholder="Apple Inc."
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={holding.quantity}
                        onChange={(e) =>
                          handleHoldingChange(index, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Value</Label>
                      <Input
                        type="number"
                        value={holding.marketValue}
                        onChange={(e) =>
                          handleHoldingChange(index, 'marketValue', parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Leverage</Label>
                      <Input
                        type="number"
                        value={holding.leverage || ''}
                        placeholder="1"
                        onChange={(e) =>
                          handleHoldingChange(index, 'leverage', parseFloat(e.target.value) || 0)
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/90"
                        onClick={() => handleRemoveHolding(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
              readOnly={isInvestment} // Read-only for investment accounts as it's calculated from holdings
              className={isInvestment ? 'bg-muted' : ''}
            />
            {isInvestment && (
              <p className="text-xs text-muted-foreground">
                Calculated automatically from holdings total value.
              </p>
            )}
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
