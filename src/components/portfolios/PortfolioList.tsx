import React, { useEffect, useState } from 'react';

import { ListOrdered, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/useAuth';
import { fromPortfolioForm, toPortfolioListItemViewModel } from '@/domains/portfolio/mappers';
import { type Portfolio, type PortfolioFormData } from '@/domains/portfolio/types';
import { usePortfolioCmds } from '@/hooks/usePortfolioCmds';
import { usePortfolios } from '@/hooks/usePortfolios';

import PortfolioForm from './PortfolioForm';
import { PortfolioItem } from './PortfolioItem';

interface PortfolioListProps {
  householdId: string;
}

const PortfolioList: React.FC<PortfolioListProps> = ({ householdId }) => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { portfolios, latestSnapshots, loading, reload } = usePortfolios(householdId);
  const { createPortfolio, updatePortfolio, reorderPortfolios } = usePortfolioCmds(
    householdId,
    userProfile?.email || '',
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [localPortfolios, setLocalPortfolios] = useState(portfolios);

  useEffect(() => {
    setLocalPortfolios(portfolios);
  }, [portfolios]);

  const movePortfolioUp = (id: string) => {
    const index = localPortfolios.findIndex((p) => p.id === id);
    if (index <= 0) return;
    const newList = [...localPortfolios];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    setLocalPortfolios(newList);
  };

  const movePortfolioDown = (id: string) => {
    const index = localPortfolios.findIndex((p) => p.id === id);
    if (index < 0 || index >= localPortfolios.length - 1) return;
    const newList = [...localPortfolios];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setLocalPortfolios(newList);
  };

  const saveOrder = async () => {
    const orders = localPortfolios.map((p, index) => ({
      id: p.id,
      order: index,
    }));
    await reorderPortfolios(orders);
    setIsReorderMode(false);
    reload();
  };

  const handleCreateSubmit = async (data: PortfolioFormData) => {
    await createPortfolio(fromPortfolioForm(data));
    reload();
  };

  const handleEditSubmit = async (data: PortfolioFormData) => {
    if (!editingPortfolio) return;
    await updatePortfolio(editingPortfolio.id, fromPortfolioForm(data));
    setEditingPortfolio(null);
    reload();
  };

  if (loading) return <div>Loading portfolios...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Portfolios</h2>
        <div className="flex gap-2">
          {isReorderMode ? (
            <>
              <Button onClick={saveOrder} variant="default">
                Save Order
              </Button>
              <Button
                onClick={() => {
                  setIsReorderMode(false);
                  setLocalPortfolios(portfolios);
                }}
                variant="ghost"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsReorderMode(true)} variant="outline">
              <ListOrdered className="mr-2 h-4 w-4" /> Reorder
            </Button>
          )}
          {!isReorderMode && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Portfolio
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {localPortfolios.map((portfolio) => (
          <PortfolioItem
            key={portfolio.id}
            viewModel={toPortfolioListItemViewModel(portfolio, latestSnapshots.get(portfolio.id))}
            onClick={(id) => navigate(`/portfolios/${id}`)}
            onEdit={() => setEditingPortfolio(portfolio)}
            isReorderMode={isReorderMode}
            onMoveUp={movePortfolioUp}
            onMoveDown={movePortfolioDown}
          />
        ))}
        {portfolios.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No portfolios found. Create one to start tracking your investments.
          </div>
        )}
      </div>

      <PortfolioForm
        isOpen={isCreateOpen || !!editingPortfolio}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingPortfolio(null);
        }}
        onSubmit={editingPortfolio ? handleEditSubmit : handleCreateSubmit}
        householdId={householdId}
        portfolio={editingPortfolio || undefined}
      />
    </div>
  );
};

export default PortfolioList;
