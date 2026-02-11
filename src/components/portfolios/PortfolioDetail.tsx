import { ArrowLeft, Plus } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { type Portfolio, type PortfolioSnapshot } from '../../schemas';
import { portfolioService } from '../../services/portfolioService';

import { PortfolioHistoryTable } from './detail/PortfolioHistoryTable';
import { PortfolioPerformanceCards } from './detail/PortfolioPerformanceCards';
import PortfolioSnapshotForm from './PortfolioSnapshotForm';

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
      <PortfolioPerformanceCards latestSnapshot={latestSnapshot} />

      {/* Snapshots History Table */}
      <PortfolioHistoryTable snapshots={snapshots} />

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
