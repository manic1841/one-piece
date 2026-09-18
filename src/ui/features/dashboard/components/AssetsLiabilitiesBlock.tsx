import React from 'react';

import { DASHBOARD_AL_LABELS } from '@/ui/constants/dashboard/assetsLiabilitiesLabels';

import type { DashboardComposition } from '@/application/dashboard/use_cases/getDashboardOverviewUseCase';

const ASSET_BAR_CLASS: Record<string, string> = {
  cash: 'bg-chart-1',
  investment: 'bg-chart-2',
};

const assetBarClass = (key: string): string => ASSET_BAR_CLASS[key] ?? 'bg-chart-3';

const share = (amount: number, items: { amount: number }[]): number => {
  const total = items.reduce((sum, item) => sum + Math.max(item.amount, 0), 0);
  if (total <= 0) {
    return 0;
  }
  return (Math.max(amount, 0) / total) * 100;
};

interface AssetsLiabilitiesBlockProps {
  composition: DashboardComposition | null;
  loading: boolean;
}

export const AssetsLiabilitiesBlock: React.FC<AssetsLiabilitiesBlockProps> = ({
  composition,
  loading,
}) => (
  <section className="rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-6">
    <p className="text-xs font-medium tracking-widest text-muted-foreground">
      {DASHBOARD_AL_LABELS.SECTION_TITLE}
    </p>
    {loading ? (
      <div className="mt-5 h-10 animate-pulse rounded bg-muted" />
    ) : !composition ? (
      <p className="mt-5 text-sm text-muted-foreground">{DASHBOARD_AL_LABELS.EMPTY_HINT}</p>
    ) : (
      <div className="mt-5 space-y-4" data-testid="assets-liabilities">
        <div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {composition.assets.map((item) => (
              <div
                key={item.key}
                data-testid={`al-asset-${item.key}`}
                className={`h-full ${assetBarClass(item.key)}`}
                style={{ width: `${share(item.amount, composition.assets)}%` }}
                title={`${item.label} ${item.amount.toLocaleString()}`}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {composition.assets.map((item) => (
              <li key={item.key} className="flex items-baseline gap-2">
                <span className={`h-2 w-2 rounded-full ${assetBarClass(item.key)}`} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="font-mono text-xs tabular-nums text-foreground">
                  {item.amount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {composition.liabilities.map((item) => (
              <div
                key={item.key}
                data-testid={`al-liability-${item.key}`}
                className="h-full bg-chart-5"
                style={{ width: `${share(item.amount, composition.liabilities)}%` }}
                title={`${item.label} ${item.amount.toLocaleString()}`}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
            {composition.liabilities.map((item) => (
              <li key={item.key} className="flex items-baseline gap-2">
                <span className="h-2 w-2 rounded-full bg-chart-5" />
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="font-mono text-xs tabular-nums text-foreground">
                  {item.amount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
  </section>
);
