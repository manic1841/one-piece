import React, { useCallback, useState } from 'react';

import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ZodError } from 'zod';

import { type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { Button } from '@/ui/components/ui/button';
import { usePortfolioCmds } from '@/ui/features/portfolio/hooks/usePortfolioCmds';
import {
  usePortfolioDetailView,
  usePortfolioQueries,
  usePortfolios,
} from '@/ui/features/portfolio/hooks/usePortfolios';
import {
  type PortfolioSnapshotFormVM,
  mapPortfolioSnapshotVMToDomain,
} from '@/ui/features/portfolio/viewmodels/portfolioForm.vm';

import PortfolioSnapshotForm from './PortfolioSnapshotForm';
import { PortfolioHistoryTable } from './detail/PortfolioHistoryTable';
import { PortfolioPerformanceCards } from './detail/PortfolioPerformanceCards';

interface PortfolioDetailProps {
  householdId: string;
  userEmail: string;
}

const PortfolioDetail: React.FC<PortfolioDetailProps> = ({ householdId, userEmail }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { portfolios, reload, loading: listLoading } = usePortfolios(householdId);
  const { getSnapshots, loading: queryLoading } = usePortfolioQueries(householdId);
  const { createSnapshot, deleteSnapshot } = usePortfolioCmds(householdId, userEmail, reload);

  const portfolio = portfolios.find((p) => p.id === id);
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);

  const refreshSnapshots = useCallback(async () => {
    if (!id) return;

    setLoadingSnapshots(true);
    try {
      const res = await getSnapshots(id);
      if (res) {
        setSnapshots(res);
      }
    } finally {
      setLoadingSnapshots(false);
    }
  }, [id, getSnapshots]);

  React.useEffect(() => {
    refreshSnapshots();
  }, [refreshSnapshots, reload]);

  const loading = listLoading || queryLoading || loadingSnapshots;
  const viewModel = usePortfolioDetailView(portfolio, snapshots);

  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  const handleCreateSnapshot = async (vm: PortfolioSnapshotFormVM) => {
    if (!id) return;
    try {
      await createSnapshot(id, vm.year, vm.month, mapPortfolioSnapshotVMToDomain(vm));
      await refreshSnapshots();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new Error(error.issues[0]?.message || 'Invalid snapshot form data');
      }
      console.error('Failed to create snapshot:', error);
      throw error; // Re-throw to be caught by form
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!portfolio || !viewModel) return <div>Portfolio not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/portfolios')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{viewModel.name}</h2>
          <p className="text-sm text-muted-foreground">{viewModel.description}</p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setIsSnapshotOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Record Snapshot
          </Button>
        </div>
      </div>

      {/* Performance Summary Cards */}
      <PortfolioPerformanceCards latestSnapshot={viewModel.latestSnapshot} />

      {/* Snapshots History Table */}
      <PortfolioHistoryTable
        snapshots={viewModel.history}
        onDelete={async (snapshotId) => {
          if (!id) return;
          await deleteSnapshot(id, snapshotId);
          await refreshSnapshots();
        }}
      />

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
