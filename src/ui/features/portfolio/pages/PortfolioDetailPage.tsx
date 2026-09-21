import React from 'react';

import { useAuth } from '@/infra/contexts/useAuth';
import PortfolioDetail from '@/ui/features/portfolio/components/PortfolioDetail';

const PortfolioView: React.FC = () => {
  const { userProfile } = useAuth();

  if (!userProfile?.householdId) {
    return <div>Loading...</div>;
  }

  return <PortfolioDetail householdId={userProfile.householdId} />;
};

export default PortfolioView;
