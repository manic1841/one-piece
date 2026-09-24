import React from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { PageHeader } from '@/ui/components/PageHeader';
import { Badge } from '@/ui/components/ui/badge';
import PortfolioDetail from '@/ui/features/portfolio/components/PortfolioDetail';
import { usePortfolioCmds } from '@/ui/features/portfolio/hooks/usePortfolioCmds';
import { usePortfolios } from '@/ui/features/portfolio/hooks/usePortfolios';
import { formatYearMonth } from '@/ui/utils';

const PortfolioDetailPage: React.FC = () => {
  const { userProfile } = useAuthState();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const householdId = userProfile?.householdId ?? '';
  const { portfolios, latestSnapshots, loading } = usePortfolios(householdId);
  const { updatePortfolio } = usePortfolioCmds(householdId, userProfile?.email || '');

  const portfolio = portfolios.find((item) => item.id === id);

  if (!userProfile?.householdId || loading) {
    return <div>Loading...</div>;
  }

  if (!portfolio) {
    return <div>Portfolio not found</div>;
  }

  const handleRename = async (name: string) => {
    await updatePortfolio(portfolio.id, { name });
  };

  const latestSnapshot = latestSnapshots.get(portfolio.id);

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={<InlineEditableTitle value={portfolio.name} onSave={handleRename} />}
        description="一個證券帳戶連結一個銀行帳戶"
        crumb="PORTFOLIOS"
        onBack={() => navigate('/portfolios')}
        badge={
          latestSnapshot ? (
            <Badge variant="outline" className="font-mono">
              {formatYearMonth(latestSnapshot.year, latestSnapshot.month)}
            </Badge>
          ) : undefined
        }
      />

      <PortfolioDetail householdId={householdId} portfolio={portfolio} />
    </div>
  );
};

export default PortfolioDetailPage;
