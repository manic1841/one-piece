import React from 'react';

import { useNavigate } from 'react-router-dom';

import { ActivityList, ActivityRow } from '@/ui/components/ActivityList';
import { EmptyState } from '@/ui/components/EmptyState';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { InteractiveLineChart } from '@/ui/components/charts/InteractiveLineChart';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { DASHBOARD_RECENT_LABELS } from '@/ui/constants/dashboard/recentTransactionsLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { AssetCompositionBlock } from '@/ui/features/dashboard/components/AssetCompositionBlock';
import { CashFlowChartBlock } from '@/ui/features/dashboard/components/CashFlowChartBlock';
import { MonthlyCloseCard } from '@/ui/features/dashboard/components/MonthlyCloseCard';
import { useDashboardCloseStatus } from '@/ui/features/dashboard/hooks/useDashboardCloseStatus';
import { useDashboardOverview } from '@/ui/features/dashboard/hooks/useDashboardOverview';
import { useDashboardRecentTransactions } from '@/ui/features/dashboard/hooks/useDashboardRecentTransactions';
import { useDashboardStatRow } from '@/ui/features/dashboard/hooks/useDashboardStatRow';
import type { DashboardHeroVM } from '@/ui/features/dashboard/viewmodels/dashboardHero.vm';
import type { DashboardRecentVM } from '@/ui/features/dashboard/viewmodels/dashboardRecent.vm';
import { mapDashboardOverviewToStatRowVM } from '@/ui/features/dashboard/viewmodels/dashboardStatRow.vm';

const TAGLINE_CLASS = 'hidden font-mono text-sm leading-relaxed text-muted-foreground md:block';

interface HeroSectionProps {
  loading: boolean;
  error: string | null;
  heroVM: DashboardHeroVM;
}

const HeroSection: React.FC<HeroSectionProps> = ({ loading, error, heroVM }) => {
  const change =
    heroVM.ytd === null
      ? undefined
      : `${heroVM.ytd.percentText}${
          heroVM.ytd.amountText != null ? ` · ${heroVM.ytd.amountText}` : ''
        }`;

  return (
    <PageSection spacing="compact">
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-3">
        <p className={TAGLINE_CLASS}>
          A calmer
          <br />
          way to a richer life.
        </p>
        <div className="text-center">
          <p className="text-sm font-medium tracking-widest text-muted-foreground">NET WORTH</p>
          {loading ? (
            <Skeleton className="mx-auto mt-4 h-12 w-64" />
          ) : error ? (
            <Alert variant="warning" className="mt-4 text-left">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <FinancialNumber
              className="mt-3"
              value={heroVM.netWorthText}
              size="hero"
              change={change}
              changeTone={heroVM.ytd?.direction === 'negative' ? 'negative' : 'positive'}
            />
          )}
          {!loading && !error && heroVM.hasAnchor && heroVM.anchorPeriodText != null && (
            <p className="mt-3 font-mono text-xs tabular-nums text-muted-foreground">
              {heroVM.anchorPeriodText}
            </p>
          )}
          {!loading && !error && !heroVM.hasAnchor && (
            <p className="mt-4 text-sm text-muted-foreground">完成本月關帳後顯示淨資產</p>
          )}
        </div>
        <p className={`${TAGLINE_CLASS} md:text-right`}>
          Every number,
          <br />
          accounted for.
        </p>
      </div>
    </PageSection>
  );
};

interface RecentTransactionsSectionProps {
  loading: boolean;
  error: string | null;
  vm: DashboardRecentVM;
}

const RecentTransactionsSection: React.FC<RecentTransactionsSectionProps> = ({
  loading,
  error,
  vm,
}) => {
  const navigate = useNavigate();

  return (
    <PageSection title={DASHBOARD_RECENT_LABELS.SECTION_TITLE} spacing="compact">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : error ? (
        <Alert variant="warning">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : vm.items.length === 0 ? (
        <EmptyState
          title={DASHBOARD_RECENT_LABELS.EMPTY_TITLE}
          description={DASHBOARD_RECENT_LABELS.ENTRY_HINT}
          action={
            <Button variant="text" onClick={() => navigate('/transactions')}>
              {DASHBOARD_RECENT_LABELS.VIEW_ALL}
            </Button>
          }
        />
      ) : (
        <ActivityList>
          {vm.items.map((item) => (
            <ActivityRow
              key={item.id}
              date={item.dateText}
              title={item.displayTitle}
              amount={`${item.isPositive ? '+' : '-'}${item.amountText}`}
              tone={item.isPositive ? 'positive' : 'negative'}
              onActivate={() => navigate('/transactions')}
            />
          ))}
        </ActivityList>
      )}
    </PageSection>
  );
};

const Dashboard: React.FC = () => {
  const { userProfile } = useAuthState();
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

  const anchor = overview?.anchor ?? null;

  return (
    <div>
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

      <HeroSection loading={loading} error={error} heroVM={heroVM} />

      <PageSection title="NET WORTH TREND" spacing="compact">
        {loading ? (
          <Skeleton className="h-52 w-full" />
        ) : heroVM.trend.hasData ? (
          <InteractiveLineChart
            values={heroVM.trend.values}
            points={heroVM.trend.points}
            xLabels={heroVM.trend.labels}
            includeZero
            yAxis="left"
            height={208}
            ariaLabel="12 month net worth trend"
          />
        ) : (
          <p className="text-sm text-muted-foreground">完成本月關帳後顯示趨勢</p>
        )}
      </PageSection>

      <PageSection title={statRowVM.sectionTitle} spacing="compact">
        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <MetricGroup columns={5} lastSpansFull>
            {statRowVM.metrics.map((metric) => (
              <Metric
                key={metric.key}
                testId={`stat-${metric.key}`}
                label={metric.label}
                value={metric.valueText}
                tone={metric.tone}
                change={metric.detailText ?? undefined}
              />
            ))}
          </MetricGroup>
        )}
      </PageSection>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AssetCompositionBlock composition={anchor?.composition ?? null} loading={loading} />

        <CashFlowChartBlock series={overview?.cashFlowSeries ?? []} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <MonthlyCloseCard
          vm={closeStatusVM}
          loading={closeStatusLoading}
          error={closeStatusError}
          nextMonthDue={nextMonthDue}
          nextMonthDueLoading={statRowLoading}
        />

        <RecentTransactionsSection loading={recentLoading} error={recentError} vm={recentVM} />
      </div>
    </div>
  );
};

export default Dashboard;
