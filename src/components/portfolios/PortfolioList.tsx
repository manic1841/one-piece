import React, { useState } from 'react';

import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { usePortfolioCmds } from '@/hooks/usePortfolioCmds';
import { usePortfolios } from '@/hooks/usePortfolios';
import { type PortfolioCreate } from '@/schemas';

import PortfolioForm from './PortfolioForm';
import { PortfolioItem } from './PortfolioItem';

interface PortfolioListProps {
  householdId: string;
}

const PortfolioList: React.FC<PortfolioListProps> = ({ householdId }) => {
  const navigate = useNavigate();
  const { portfolios, latestSnapshots, loading, reload } = usePortfolios(householdId);
  const { createPortfolio } = usePortfolioCmds(householdId, 'test-user@example.com');

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleCreateSubmit = async (data: PortfolioCreate) => {
    await createPortfolio(data);
    reload();
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
        {portfolios.map((portfolio) => (
          <PortfolioItem
            key={portfolio.id}
            portfolio={portfolio}
            latestSnapshot={latestSnapshots.get(portfolio.id)}
            onClick={(id) => navigate(`/portfolios/${id}`)}
          />
        ))}
        {portfolios.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No portfolios found. Create one to start tracking your investments.
          </div>
        )}
      </div>

      <PortfolioForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        householdId={householdId}
      />
    </div>
  );
};

export default PortfolioList;
