import React from 'react';

import { useAuth } from '@/infra/contexts/useAuth';
import PortfolioDetail from '@/ui/features/portfolio/components/PortfolioDetail';

const PortfolioView: React.FC = () => {
  const { userProfile, currentUser } = useAuth();

  if (!userProfile?.householdId || !currentUser?.email) {
    return <div>Loading...</div>;
  }

  return <PortfolioDetail householdId={userProfile.householdId} userEmail={currentUser.email} />;
};

export default PortfolioView;
