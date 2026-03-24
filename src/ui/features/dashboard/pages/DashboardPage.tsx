import React from 'react';

import { useAuth } from '@/infra/contexts/useAuth';
import AssetTrendCard from '@/ui/features/dashboard/components/AssetTrendCard';
import DebtSummaryCard from '@/ui/features/dashboard/components/DebtSummaryCard';
import LeverageStatsCardUI from '@/ui/features/dashboard/components/LeverageStatsCardUI';
// import UnsettledStatsCardUI from '@/ui/features/dashboard/components/UnsettledStatsCardUI';
import { useDashboardPage } from '@/ui/features/dashboard/hooks/useDashboardPage';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId;

  const { leverageStats, statsLoading } = useDashboardPage({
    householdId,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <AssetTrendCard householdId={householdId} />
        </div>
        <DebtSummaryCard householdId={householdId} />
        <LeverageStatsCardUI stats={leverageStats} loading={statsLoading} />
        
        {/* Temporarily hidden UnsettledStatsCardUI
        <UnsettledStatsCardUI stats={unsettledStats} loading={statsLoading} />
        */}
      </div>
    </div>
  );
};

export default Dashboard;
