import React from 'react';

import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { DonutChart } from '@/ui/components/charts/DonutChart';
import { DASHBOARD_ASSET_LABELS } from '@/ui/constants/dashboard/assetCompositionLabels';
import type { DashboardComposition } from '@/ui/features/dashboard/viewmodels/dashboardHero.vm';

interface AssetCompositionBlockProps {
  composition: DashboardComposition | null;
  loading: boolean;
}

const formatTWD = (amount: number): string => `NT$${Math.round(amount).toLocaleString('en-US')}`;

const totalOf = (items: { amount: number }[]): number =>
  items.reduce((sum, item) => sum + Math.max(item.amount, 0), 0);

export const AssetCompositionBlock: React.FC<AssetCompositionBlockProps> = ({
  composition,
  loading,
}) => (
  <PageSection title={DASHBOARD_ASSET_LABELS.SECTION_TITLE} spacing="compact">
    {loading ? (
      <Skeleton className="h-40 w-full" />
    ) : !composition ? (
      <p className="text-sm text-muted-foreground">{DASHBOARD_ASSET_LABELS.EMPTY_HINT}</p>
    ) : (
      <div data-testid="asset-composition" className="mt-4">
        <DonutChart
          segments={composition.assets.map((item) => ({
            label: item.label,
            value: item.amount,
          }))}
          centerLabel={formatTWD(totalOf(composition.assets))}
          ariaLabel="Asset composition"
        />
      </div>
    )}
  </PageSection>
);
