import React from 'react';

import PortfolioDetail from '../components/portfolios/PortfolioDetail';
import { useAuth } from '../contexts/useAuth';

const PortfolioView: React.FC = () => {
  const { userProfile, currentUser } = useAuth();

  if (!userProfile?.householdId || !currentUser?.email) {
    return <div>Loading...</div>;
  }

  return (
    <PortfolioDetail 
      householdId={userProfile.householdId} 
      userEmail={currentUser.email} 
    />
  );
};

export default PortfolioView;
