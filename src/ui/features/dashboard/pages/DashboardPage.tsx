import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/infra/contexts/useAuth';
import { useDashboardOverview } from '@/ui/features/dashboard/hooks/useDashboardOverview';
import { useDashboardCloseStatus } from '@/ui/features/dashboard/hooks/useDashboardCloseStatus';
import { useDashboardRecentTransactions } from '@/ui/features/dashboard/hooks/useDashboardRecentTransactions';
import { DASHBOARD_PULSE_LABELS } from '@/ui/constants/dashboard/pulseLabels';
import { DASHBOARD_CLOSE_LABELS } from '@/ui/constants/dashboard/monthlyCloseStatus';
import { DASHBOARD_RECENT_LABELS } from '@/ui/constants/dashboard/recentTransactionsLabels';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { ChevronRight, Receipt } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const householdId = userProfile?.householdId;
  const { heroVM, pulseVM, loading, error } = useDashboardOverview(householdId);
  const { vm: closeStatusVM, loading: closeStatusLoading, error: closeStatusError } =
    useDashboardCloseStatus(householdId);
  const { vm: recentVM, loading: recentLoading, error: recentError } =
    useDashboardRecentTransactions(householdId);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-border bg-elevated p-6 md:p-8">
        <p className="text-xs font-medium tracking-widest text-muted-foreground">NET WORTH</p>
        {loading ? (
          <div className="mt-4 h-10 w-48 animate-pulse rounded bg-muted" />
        ) : error ? (
          <p className="mt-4 text-sm text-negative">{error}</p>
        ) : (
          <>
            <p className="mt-4 font-mono text-4xl md:text-5xl tabular-nums text-foreground">
              {heroVM.netWorthText}
            </p>
            {heroVM.hasAnchor ? (
              <div className="mt-6 flex items-end justify-between gap-6">
                {heroVM.anchorPeriodText != null && (
                  <p className="text-xs font-medium text-muted-foreground">
                    {heroVM.anchorPeriodText}
                  </p>
                )}
                {heroVM.sparkline.path && (
                  <svg
                    className="h-12 w-60"
                    viewBox="0 0 240 48"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path d={heroVM.sparkline.areaPath} fill="hsl(var(--chart-3))" opacity="0.08" />
                    <path
                      d={heroVM.sparkline.path}
                      fill="none"
                      stroke="hsl(var(--chart-3))"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">完成本月關帳後顯示淨資產</p>
            )}
          </>
        )}
      </section>
      {pulseVM.metrics.length > 0 || loading || error ? (
        <section className="rounded-lg border border-border bg-elevated p-6 md:p-8">
          <p className="text-xs font-medium tracking-widest text-muted-foreground">
            {DASHBOARD_PULSE_LABELS.SECTION_TITLE}
          </p>
          {loading ? (
            <div className="mt-5 grid grid-cols-2 gap-6 md:grid-cols-4">
              <div className="h-16 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded bg-muted" />
              <div className="h-16 animate-pulse rounded bg-muted" />
            </div>
          ) : error ? (
            <p className="mt-5 text-sm text-negative">{error}</p>
          ) : (
            <dl className="mt-5 grid grid-cols-2 gap-6 md:grid-cols-4">
              {pulseVM.metrics.map((metric) => (
                <div key={metric.key}>
                  <dt className="text-xs font-medium text-muted-foreground">{metric.label}</dt>
                  <dd
                    className={`mt-2 font-mono text-xl tabular-nums text-foreground ${metric.valueClassName}`}
                  >
                    {metric.valueText}
                  </dd>
                  {metric.detailText != null && (
                    <dd className="mt-1 font-mono text-xs text-muted-foreground">
                      {metric.detailText}
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          )}
        </section>
      ) : (
        <section className="rounded-lg border border-border bg-elevated p-6 md:p-8">
          <p className="text-xs font-medium tracking-widest text-muted-foreground">
            {DASHBOARD_PULSE_LABELS.SECTION_TITLE}
          </p>
          <p className="mt-5 text-sm text-muted-foreground">
            {DASHBOARD_PULSE_LABELS.EMPTY_HINT}
          </p>
        </section>
      )}
      <button
        type="button"
        onClick={() => navigate('/close')}
        className="block w-full cursor-pointer rounded-lg border border-border bg-elevated p-6 md:p-8 text-left transition-colors hover:bg-muted"
      >
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs font-medium tracking-widest text-muted-foreground">
            {DASHBOARD_CLOSE_LABELS.SECTION_TITLE}
          </p>
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        {closeStatusLoading ? (
          <div className="mt-4 h-6 w-40 animate-pulse rounded bg-muted" />
        ) : closeStatusError ? (
          <p className="mt-4 text-sm text-negative">{closeStatusError}</p>
        ) : closeStatusVM ? (
          <div className="mt-4 flex items-center gap-3">
            <p className="font-mono text-lg tabular-nums text-foreground">
              {closeStatusVM.periodText}
            </p>
            <StatusGlyph type={closeStatusVM.glyphType} label={closeStatusVM.statusText} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {DASHBOARD_CLOSE_LABELS.ENTRY_HINT}
          </p>
        )}
      </button>
      <section className="rounded-lg border border-border bg-elevated p-6 md:p-8">
        <div className="flex items-center gap-2">
          <Receipt className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs font-medium tracking-widest text-muted-foreground">
            {DASHBOARD_RECENT_LABELS.SECTION_TITLE}
          </p>
        </div>
        {recentLoading ? (
          <div className="mt-5 space-y-3">
            <div className="h-12 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
          </div>
        ) : recentError ? (
          <p className="mt-5 text-sm text-negative">{recentError}</p>
        ) : recentVM.items.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">
            {DASHBOARD_RECENT_LABELS.ENTRY_HINT}
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recentVM.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate('/transactions')}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {item.displayTitle}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                      {item.dateText}
                    </span>
                    <span
                      className={`font-mono text-sm tabular-nums ${
                        item.isPositive ? 'text-positive' : 'text-negative'
                      }`}
                    >
                      {item.isPositive ? '+' : '-'}
                      {item.amountText}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
