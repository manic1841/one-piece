import React from 'react';

import { useAuthState } from '@/ui/contexts/useAuthState';
import PortfolioList from '@/ui/features/portfolio/components/PortfolioList';

const Portfolios: React.FC = () => {
  const { userProfile } = useAuthState();

  if (!userProfile?.householdId) {
    return <div>Loading...</div>;
  }

  return <PortfolioList householdId={userProfile.householdId} />;
};

export default Portfolios;
