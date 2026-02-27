import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Briefcase, Plus } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { type Account, type Portfolio, type PortfolioSnapshot } from '../../schemas';
import { accountService } from '../../services/accountService';
import { portfolioService } from '../../services/portfolioService';
import { formatYearMonth } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/formatUtils';

interface PortfolioListProps {
  householdId: string;
}

const PortfolioList: React.FC<PortfolioListProps> = ({ householdId }) => {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [latestSnapshots, setLatestSnapshots] = useState<Map<string, PortfolioSnapshot>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Create Form State
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const [createLoading, setCreateLoading] = useState(false);

  const loadPortfolios = useCallback(async () => {
    try {
      const data = await portfolioService.getPortfolios(householdId);
      setPortfolios(data);

      // Load latest snapshot for each portfolio
      const snapshotsMap = new Map<string, PortfolioSnapshot>();
      for (const portfolio of data) {
        const snapshots = await portfolioService.getSnapshots(householdId, portfolio.id);
        if (snapshots.length > 0) {
          snapshotsMap.set(portfolio.id, snapshots[0]);
        }
      }
      setLatestSnapshots(snapshotsMap);
    } catch (error) {
      console.error('Failed to load portfolios:', error);
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await accountService.getAccounts(householdId);
      setAvailableAccounts(data);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  }, [householdId]);

  useEffect(() => {
    loadPortfolios();
    loadAccounts();
  }, [loadPortfolios, loadAccounts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    setCreateLoading(true);
    try {
      await portfolioService.createPortfolio(
        householdId,
        {
          name: newName,
          description: newDescription,
          accountIds: selectedAccountIds,
          isActive: true,
        },
        'test-user@example.com',
      );
      setIsCreateOpen(false);
      setNewName('');
      setNewDescription('');
      setSelectedAccountIds([]);
      loadPortfolios();
    } catch (error) {
      console.error('Failed to create portfolio:', error);
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId) ? prev.filter((id) => id !== accountId) : [...prev, accountId],
    );
  };

  if (loading) return <div>Loading portfolios...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Portfolios</h2>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Portfolio
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {portfolios.map((portfolio) => {
          const latestSnapshot = latestSnapshots.get(portfolio.id);
          return (
            <Card
              key={portfolio.id}
              className="cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => navigate(`/portfolios/${portfolio.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{portfolio.name}</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {latestSnapshot ? formatCurrency(latestSnapshot.totalValue) : '--'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {latestSnapshot
                    ? `As of ${formatYearMonth(latestSnapshot.year, latestSnapshot.month)}`
                    : `${portfolio.accountIds.length} linked accounts`}
                </p>
                {portfolio.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {portfolio.description}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
        {portfolios.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No portfolios found. Create one to start tracking your investments.
          </div>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Portfolio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-4">
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
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createLoading}>
                {createLoading ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortfolioList;
