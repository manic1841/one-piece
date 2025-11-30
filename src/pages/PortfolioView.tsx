import React from 'react';
import { useAuth } from '../contexts/useAuth';
import PortfolioDetail from '../components/portfolios/PortfolioDetail';

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
