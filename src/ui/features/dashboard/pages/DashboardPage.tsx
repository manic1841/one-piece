import React from 'react';

import { useNavigate } from 'react-router-dom';

import { DASHBOARD_RECENT_LABELS } from '@/ui/constants/dashboard/recentTransactionsLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { AssetsLiabilitiesBlock } from '@/ui/features/dashboard/components/AssetsLiabilitiesBlock';
import { CashFlowChartBlock } from '@/ui/features/dashboard/components/CashFlowChartBlock';
import { HeroYtd } from '@/ui/features/dashboard/components/HeroYtd';
import { MonthlyCloseCard } from '@/ui/features/dashboard/components/MonthlyCloseCard';
import { useDashboardCloseStatus } from '@/ui/features/dashboard/hooks/useDashboardCloseStatus';
import { useDashboardOverview } from '@/ui/features/dashboard/hooks/useDashboardOverview';
import { useDashboardRecentTransactions } from '@/ui/features/dashboard/hooks/useDashboardRecentTransactions';
import { useDashboardStatRow } from '@/ui/features/dashboard/hooks/useDashboardStatRow';
import { mapDashboardOverviewToStatRowVM } from '@/ui/features/dashboard/viewmodels/dashboardStatRow.vm';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuthState();
  const navigate = useNavigate();
  const householdId = userProfile?.householdId;
  const { overview, heroVM, loading, errorMessage: error } = useDashboardOverview(householdId);
  const { nextMonthDue, loading: statRowLoading } = useDashboardStatRow(householdId);
  const statRowVM = mapDashboardOverviewToStatRowVM(overview);
  const {
    vm: closeStatusVM,
    loading: closeStatusLoading,
    errorMessage: closeStatusError,
  } = useDashboardCloseStatus(householdId);
  const {
    vm: recentVM,
    loading: recentLoading,
    errorMessage: recentError,
  } = useDashboardRecentTransactions(householdId);

  const trendVisible = heroVM.hasAnchor && heroVM.trend.path != null;
  const anchor = overview?.anchor ?? null;

  return (
    <div className="space-y-6">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
        }}
      />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="hidden md:flex md:flex-col md:justify-center">
          <p className="font-mono text-sm leading-relaxed text-muted-foreground">
            A calmer
            <br />
            way to a richer life.
          </p>
        </div>
        <div className="text-center md:col-span-2">
          <p className="text-sm font-medium tracking-widest text-muted-foreground">NET WORTH</p>
          {loading ? (
            <div className="mx-auto mt-4 h-12 w-64 animate-pulse rounded bg-muted" />
          ) : error ? (
            <p className="mt-4 text-sm text-negative">{error}</p>
          ) : (
            <p className="mt-3 font-mono text-5xl tabular-nums text-foreground md:text-6xl">
              {heroVM.netWorthText}
            </p>
          )}
          {heroVM.hasAnchor && heroVM.anchorPeriodText != null && (
            <p className="mt-3 font-mono text-xs tabular-nums text-muted-foreground">
              {heroVM.anchorPeriodText}
            </p>
          )}
          {heroVM.hasAnchor && <HeroYtd ytd={heroVM.ytd} />}
          {!loading && !error && !heroVM.hasAnchor && (
            <p className="mt-4 text-sm text-muted-foreground">完成本月關帳後顯示淨資產</p>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-6">
        <p className="text-xs font-medium tracking-widest text-muted-foreground">NET WORTH TREND</p>
        {loading ? (
          <div className="mt-5 h-52 animate-pulse rounded bg-muted" />
        ) : trendVisible ? (
          <div className="mt-5">
            <div className="relative">
              <svg
                className="h-52 w-full"
                viewBox="0 0 720 220"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {heroVM.trend.yLabels.map((label) => (
                  <line
                    key={label.text}
                    x1="64"
                    x2="712"
                    y1={label.y}
                    y2={label.y}
                    stroke="hsl(var(--border))"
                    strokeWidth="1"
                  />
                ))}
                <path d={heroVM.trend.areaPath} fill="hsl(var(--chart-3))" opacity="0.12" />
                <path
                  d={heroVM.trend.path}
                  fill="none"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {heroVM.trend.endPoint && (
                  <circle
                    cx={heroVM.trend.endPoint.x}
                    cy={heroVM.trend.endPoint.y}
                    r="4"
                    fill="hsl(var(--chart-3))"
                  />
                )}
              </svg>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                {heroVM.trend.yLabels.map((label) => (
                  <span
                    key={label.text}
                    className="absolute left-0 -translate-y-1/2 font-mono text-[10px] tabular-nums text-muted-foreground"
                    style={{ top: `${(label.y / 220) * 100}%` }}
                  >
                    {label.text}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative mt-2 h-4">
              {heroVM.trend.xLabels.map((label, index) => (
                <span
                  key={label.text}
                  className="absolute whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground"
                  style={{
                    left: `${(label.x / 720) * 100}%`,
                    transform:
                      index === 0
                        ? 'none'
                        : index === heroVM.trend.xLabels.length - 1
                          ? 'translateX(-100%)'
                          : 'translateX(-50%)',
                  }}
                >
                  {label.text}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">完成本月關帳後顯示趨勢</p>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-xs font-medium tracking-widest text-muted-foreground">
          {statRowVM.sectionTitle}
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {statRowVM.metrics.map((metric, index) => (
            <div
              key={metric.key}
              data-testid={`stat-${metric.key}`}
              className={
                index === statRowVM.metrics.length - 1
                  ? 'col-span-2 rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-5 md:col-span-1'
                  : 'rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-5'
              }
            >
              <p className="text-xs font-medium tracking-widest text-muted-foreground">
                {metric.label}
              </p>
              {loading ? (
                <div className="mt-3 h-7 w-24 animate-pulse rounded bg-muted" />
              ) : (
                <p
                  className={`mt-2 font-mono text-2xl tabular-nums ${metric.valueClassName || 'text-foreground'}`}
                >
                  {metric.valueText}
                </p>
              )}
              {metric.detailText != null && !loading && (
                <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground">
                  {metric.detailText}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <AssetsLiabilitiesBlock composition={anchor?.composition ?? null} loading={loading} />

      <CashFlowChartBlock series={overview?.cashFlowSeries ?? []} loading={loading} />

      <section className="rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-6">
        <p className="text-xs font-medium tracking-widest text-muted-foreground">
          {DASHBOARD_RECENT_LABELS.SECTION_TITLE}
        </p>
        {recentLoading ? (
          <div className="mt-5 space-y-3">
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
          </div>
        ) : recentError ? (
          <p className="mt-5 text-sm text-negative">{recentError}</p>
        ) : recentVM.items.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">{DASHBOARD_RECENT_LABELS.ENTRY_HINT}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {recentVM.items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigate('/transactions')}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="w-20 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {item.dateText}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {item.displayTitle}
                  </span>
                  <span
                    className={`shrink-0 font-mono text-sm tabular-nums ${
                      item.isPositive ? 'text-positive' : 'text-negative'
                    }`}
                  >
                    {item.isPositive ? '+' : '-'}
                    {item.amountText}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <MonthlyCloseCard
        vm={closeStatusVM}
        loading={closeStatusLoading}
        error={closeStatusError}
        nextMonthDue={nextMonthDue}
        nextMonthDueLoading={statRowLoading}
      />
    </div>
  );
};

export default Dashboard;
