import React, { useState, useEffect } from 'react';
import { type Portfolio, type Account, type Holding } from '../../schemas';
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

interface PortfolioSnapshotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    year: number;
    month: number;
    cashFlow: { deposits: number; withdrawals: number };
  }) => Promise<void>;
  portfolio: Portfolio;
  householdId: string;
}

const PortfolioSnapshotForm: React.FC<PortfolioSnapshotFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  portfolio,
  householdId,
}) => {
  const currentDate = new Date();
  const [year, setYear] = useState(currentDate.getFullYear());
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [deposits, setDeposits] = useState('');
  const [withdrawals, setWithdrawals] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Account data for display/verification
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountSnapshots, setAccountSnapshots] = useState<Map<string, { amount: number; holdings?: Holding[] }>>(new Map());

  useEffect(() => {
    const loadAccounts = async () => {
      const loadedAccounts: Account[] = [];
      for (const accountId of portfolio.accountIds) {
        const account = await accountService.getAccount(householdId, accountId);
        if (account) loadedAccounts.push(account);
      }
      setAccounts(loadedAccounts);
    };
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen, householdId, portfolio.accountIds]);

  // Load account snapshots when year/month changes
  useEffect(() => {
    const loadSnapshots = async () => {
      if (accounts.length === 0) return;
      
      const snapshotMap = new Map<string, { amount: number; holdings?: Holding[] }>();
      
      for (const account of accounts) {
        const snapshots = await accountService.getSnapshots(householdId, account.id, year, month);
        if (snapshots.length > 0) {
          snapshotMap.set(account.id, { 
            amount: snapshots[0].amount,
            holdings: snapshots[0].holdings 
          });
        }
      }
      setAccountSnapshots(snapshotMap);
    };

    if (isOpen && accounts.length > 0) {
      loadSnapshots();
    }
  }, [isOpen, householdId, accounts, year, month]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onSubmit({
        year,
        month,
        cashFlow: {
          deposits: parseFloat(deposits) || 0,
          withdrawals: parseFloat(withdrawals) || 0,
        },
      });
      onClose();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to create snapshot');
    } finally {
      setLoading(false);
    }
  };

  const totalValue = Array.from(accountSnapshots.values()).reduce((sum, s) => sum + s.amount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Portfolio Snapshot - {portfolio.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
          )}

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

          {/* Account Snapshots Summary */}
          <div className="space-y-3">
            <Label>Account Snapshots (Auto-loaded)</Label>
            <div className="space-y-2 border rounded-md p-4 bg-slate-50">
              {accounts.map((account) => {
                const snapshot = accountSnapshots.get(account.id);
                return (
                  <div key={account.id} className="flex justify-between items-start border-b last:border-0 pb-2 last:pb-0">
                    <div>
                      <div className="font-medium">{account.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{account.type}</div>
                      {snapshot?.holdings && snapshot.holdings.length > 0 && (
                        <div className="mt-1 pl-2 border-l-2 border-slate-200">
                          {snapshot.holdings.map((h, idx) => (
                            <div key={idx} className="text-xs text-slate-600">
                              {h.name} ({h.symbol}): {h.quantity} x {h.marketValue / h.quantity} = {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency }).format(h.marketValue)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {snapshot ? (
                        <span className="font-semibold">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: account.currency }).format(snapshot.amount)}
                        </span>
                      ) : (
                        <span className="text-destructive text-sm">No snapshot found</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-300 font-bold">
                <span>Total Value</span>
                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'TWD' }).format(totalValue)}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              * Ensure you have recorded snapshots for all individual accounts for this month before creating the portfolio snapshot.
            </p>
          </div>

          {/* Cash Flow */}
          <div className="space-y-3">
            <Label>Monthly Cash Flow</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deposits" className="text-xs">Deposits (Inflow)</Label>
                <Input
                  id="deposits"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={deposits}
                  onChange={(e) => setDeposits(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdrawals" className="text-xs">Withdrawals (Outflow)</Label>
                <Input
                  id="withdrawals"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={withdrawals}
                  onChange={(e) => setWithdrawals(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || accounts.some(a => !accountSnapshots.has(a.id))}>
              {loading ? 'Saving...' : 'Create Snapshot'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioSnapshotForm;
