import React from 'react';
import { useAuth } from '../contexts/useAuth';
import PortfolioList from '../components/portfolios/PortfolioList';

const Portfolios: React.FC = () => {
  const { userProfile } = useAuth();

  if (!userProfile?.householdId) {
    return <div>Loading...</div>;
  }

  return <PortfolioList householdId={userProfile.householdId} />;
};

export default Portfolios;
