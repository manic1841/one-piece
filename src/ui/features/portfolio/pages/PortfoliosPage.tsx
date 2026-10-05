import React from 'react';

import { LoadingLine } from '@/ui/components/LoadingLine';
import { useAuthState } from '@/ui/contexts/useAuthState';
import PortfolioList from '@/ui/features/portfolio/components/PortfolioList';

const Portfolios: React.FC = () => {
  const { userProfile } = useAuthState();

  if (!userProfile?.householdId) {
    return <LoadingLine />;
  }

  return <PortfolioList />;
};

export default Portfolios;
