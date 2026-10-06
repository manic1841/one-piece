import React from 'react';

import { PageSection } from '@/ui/components/PageSection';
import { DonutChart } from '@/ui/components/charts/DonutChart';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { PORTFOLIO_ALLOCATION_LABELS } from '@/ui/constants/portfolio/labels';
import { type HoldingsAllocationVM } from '@/ui/features/portfolio/viewmodels/holdingsAllocation.vm';
import { cn } from '@/ui/utils/cn';

interface HoldingsAllocationProps {
  vm: HoldingsAllocationVM;
  /** Empty-state copy differs between the detail page and the household list. */
  emptyText: string;
}

/**
 * 持倉配置：市值與曝險兩張圓環。順序與顏色由 VM 統一決定，兩張圖對齊；
 * 沒有持倉時顯示文案而不畫 0 值圓環。
 */
const HoldingsAllocation: React.FC<HoldingsAllocationProps> = ({ vm, emptyText }) => (
  <PageSection title={PORTFOLIO_ALLOCATION_LABELS.SECTION_TITLE} spacing="compact">
    {vm.hasData ? (
      <div className="flex flex-col gap-10 md:flex-row md:gap-16">
        <div className="min-w-0 flex-1">
          <p className={cn(eyebrowClass, 'mb-4')}>{PORTFOLIO_ALLOCATION_LABELS.MARKET_TITLE}</p>
          <DonutChart
            segments={vm.marketSegments}
            centerLabel={vm.marketTotalText}
            ariaLabel={PORTFOLIO_ALLOCATION_LABELS.MARKET_ARIA}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(eyebrowClass, 'mb-4')}>{PORTFOLIO_ALLOCATION_LABELS.EXPOSURE_TITLE}</p>
          <DonutChart
            segments={vm.exposureSegments}
            centerLabel={vm.exposureTotalText}
            ariaLabel={PORTFOLIO_ALLOCATION_LABELS.EXPOSURE_ARIA}
          />
        </div>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">{emptyText}</p>
    )}
  </PageSection>
);

export default HoldingsAllocation;
