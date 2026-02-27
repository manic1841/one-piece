import React from 'react';

import PortfolioList from '../components/portfolios/PortfolioList';
import { useAuth } from '../contexts/useAuth';

const Portfolios: React.FC = () => {
  const { userProfile } = useAuth();

  if (!userProfile?.householdId) {
    return <div>Loading...</div>;
  }

  return <PortfolioList householdId={userProfile.householdId} />;
};

export default Portfolios;
