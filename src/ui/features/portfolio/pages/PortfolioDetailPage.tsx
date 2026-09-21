import React, { useState } from 'react';

import { Pencil } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/infra/contexts/useAuth';
import { PageHeader } from '@/ui/components/PageHeader';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import PortfolioForm from '@/ui/features/portfolio/components/PortfolioForm';
import PortfolioDetail from '@/ui/features/portfolio/components/PortfolioDetail';
import { usePortfolioCmds } from '@/ui/features/portfolio/hooks/usePortfolioCmds';
import { usePortfolios } from '@/ui/features/portfolio/hooks/usePortfolios';
import {
  type PortfolioFormVM,
  mapPortfolioVMToDomain,
} from '@/ui/features/portfolio/viewmodels/portfolioForm.vm';
import { formatYearMonth } from '@/ui/utils';

const PortfolioDetailPage: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const householdId = userProfile?.householdId ?? '';
  const { portfolios, latestSnapshots, reload, loading } = usePortfolios(householdId);
  const { updatePortfolio } = usePortfolioCmds(householdId, userProfile?.email || '', reload);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const portfolio = portfolios.find((item) => item.id === id);

  if (!userProfile?.householdId || loading) {
    return <div>Loading...</div>;
  }

  if (!portfolio) {
    return <div>Portfolio not found</div>;
  }

  const handleEditSubmit = async (vm: PortfolioFormVM) => {
    await updatePortfolio(portfolio.id, mapPortfolioVMToDomain(vm));
    setIsEditOpen(false);
  };

  const latestSnapshot = latestSnapshots.get(portfolio.id);
  const now = new Date();

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={portfolio.name}
        description="一個證券帳戶連結一個銀行帳戶"
        crumb="PORTFOLIOS"
        onBack={() => navigate('/portfolios')}
        badge={
          <Badge variant="outline" className="font-mono">
            {formatYearMonth(
              latestSnapshot?.year ?? now.getFullYear(),
              latestSnapshot?.month ?? now.getMonth() + 1,
            )}
          </Badge>
        }
        actions={
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Pencil size={16} />
            編輯組合
          </Button>
        }
      />

      <PortfolioDetail householdId={householdId} portfolio={portfolio} />

      {isEditOpen && (
        <PortfolioForm
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleEditSubmit}
          householdId={householdId}
          portfolio={portfolio}
        />
      )}
    </div>
  );
};

export default PortfolioDetailPage;
