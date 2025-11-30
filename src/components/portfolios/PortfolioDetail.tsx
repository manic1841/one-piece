import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type Portfolio, type PortfolioSnapshot } from '../../schemas';
import { portfolioService } from '../../services/portfolioService';
import { formatCurrency, formatPercentage } from '../../utils/formatUtils';
import { formatYearMonth } from '../../utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import PortfolioSnapshotForm from './PortfolioSnapshotForm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PortfolioDetailProps {
  householdId: string;
  userEmail: string;
}

const PortfolioDetail: React.FC<PortfolioDetailProps> = ({ householdId, userEmail }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const p = await portfolioService.getPortfolio(householdId, id);
      setPortfolio(p);
      
      const s = await portfolioService.getSnapshots(householdId, id);
      setSnapshots(s);
    } catch (error) {
      console.error('Failed to load portfolio data:', error);
    } finally {
      setLoading(false);
    }
  }, [householdId, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSnapshot = async (data: {
    year: number;
    month: number;
    cashFlow: { deposits: number; withdrawals: number };
  }) => {
    if (!id) return;
    try {
      await portfolioService.createSnapshot(
        householdId,
        id,
        data.year,
        data.month,
        userEmail,
        data.cashFlow
      );
      loadData(); // Reload to show new snapshot
    } catch (error) {
      console.error('Failed to create snapshot:', error);
      throw error; // Re-throw to be caught by form
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!portfolio) return <div>Portfolio not found</div>;

  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/portfolios')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{portfolio.name}</h2>
          <p className="text-sm text-muted-foreground">{portfolio.description}</p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setIsSnapshotOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Record Snapshot
          </Button>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestSnapshot 
                ? formatCurrency(latestSnapshot.totalValue)
                : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {latestSnapshot ? formatYearMonth(latestSnapshot.year, latestSnapshot.month) : 'No data'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Return</CardTitle>
            {latestSnapshot && latestSnapshot.performance.returnRate >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${latestSnapshot?.performance.returnRate && latestSnapshot.performance.returnRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {latestSnapshot 
                ? formatPercentage(latestSnapshot.performance.returnRate, 2)
                : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {latestSnapshot 
                ? formatCurrency(latestSnapshot.performance.gain)
                : '--'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumulative Return</CardTitle>
            {latestSnapshot && latestSnapshot.performance.cumulativeReturnRate >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${latestSnapshot?.performance.cumulativeReturnRate && latestSnapshot.performance.cumulativeReturnRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {latestSnapshot 
                ? formatPercentage(latestSnapshot.performance.cumulativeReturnRate, 2)
                : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {latestSnapshot 
                ? formatCurrency(latestSnapshot.performance.cumulativeGain)
                : '--'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow (MoM)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestSnapshot 
                ? formatCurrency(latestSnapshot.performance.netCashFlow)
                : '--'}
            </div>
             <p className="text-xs text-muted-foreground">
              In: {latestSnapshot ? formatCurrency(latestSnapshot.cashFlow.deposits) : '--'} / Out: {latestSnapshot ? formatCurrency(latestSnapshot.cashFlow.withdrawals) : '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Snapshots History Table */}
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">Return</TableHead>
                <TableHead className="text-right">Return %</TableHead>
                <TableHead className="text-right">Cumulative %</TableHead>
                <TableHead className="text-right">Net Flow</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell>{formatYearMonth(snapshot.year, snapshot.month)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(snapshot.totalValue)}
                  </TableCell>
                  <TableCell className={`text-right ${snapshot.performance.gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(snapshot.performance.gain)}
                  </TableCell>
                  <TableCell className={`text-right ${snapshot.performance.returnRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(snapshot.performance.returnRate, 2)}
                  </TableCell>
                  <TableCell className={`text-right ${snapshot.performance.cumulativeReturnRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(snapshot.performance.cumulativeReturnRate, 2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(snapshot.performance.netCashFlow)}
                  </TableCell>
                </TableRow>
              ))}
              {snapshots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No snapshots recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {portfolio && (
        <PortfolioSnapshotForm
          isOpen={isSnapshotOpen}
          onClose={() => setIsSnapshotOpen(false)}
          onSubmit={handleCreateSnapshot}
          portfolio={portfolio}
          householdId={householdId}
        />
      )}
    </div>
  );
};

export default PortfolioDetail;
