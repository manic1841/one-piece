import React from 'react';

import { useAuth } from '@/infra/contexts/useAuth';
import PortfolioList from '@/ui/features/portfolio/components/PortfolioList';

const Portfolios: React.FC = () => {
  const { userProfile } = useAuth();

  if (!userProfile?.householdId) {
    return <div>Loading...</div>;
  }

  return <PortfolioList householdId={userProfile.householdId} />;
};

export default Portfolios;
