import React from 'react';

import AssetTrendCardUI from '@/components/dashboard/AssetTrendCardUI';
import LeverageStatsCardUI from '@/components/dashboard/LeverageStatsCardUI';
import UnsettledStatsCardUI from '@/components/dashboard/UnsettledStatsCardUI';
import { useDashboardPage } from '@/hooks/pages/useDashboardPage';

import { useAuth } from '../contexts/useAuth';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId;

  const {
    trendData,
    unsettledStats,
    leverageStats,
    trendLoading,
    statsLoading,
    viewMode,
    setViewMode,
  } = useDashboardPage({
    householdId,
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <AssetTrendCardUI
            data={trendData}
            loading={trendLoading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
        <UnsettledStatsCardUI stats={unsettledStats} loading={statsLoading} />
        <LeverageStatsCardUI stats={leverageStats} loading={statsLoading} />
      </div>
    </div>
  );
};

export default Dashboard;
