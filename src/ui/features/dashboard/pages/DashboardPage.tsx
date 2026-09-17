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
import { ChevronRight } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const householdId = userProfile?.householdId;
  const { heroVM, pulseVM, loading, error } = useDashboardOverview(householdId);
  const { vm: closeStatusVM, loading: closeStatusLoading, error: closeStatusError } =
    useDashboardCloseStatus(householdId);
  const { vm: recentVM, loading: recentLoading, error: recentError } =
    useDashboardRecentTransactions(householdId);

  const trendVisible = heroVM.hasAnchor && heroVM.trend.path != null;

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
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)',
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
          {!loading && !error && !heroVM.hasAnchor && (
            <p className="mt-4 text-sm text-muted-foreground">完成本月關帳後顯示淨資產</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-6 lg:col-span-2">
          <p className="text-xs font-medium tracking-widest text-muted-foreground">
            NET WORTH TREND
          </p>
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

        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-6">
            <p className="text-xs font-medium tracking-widest text-muted-foreground">
              {DASHBOARD_PULSE_LABELS.SECTION_TITLE}
            </p>
            {loading ? (
              <div className="mt-5 space-y-4">
                <div className="h-8 animate-pulse rounded bg-muted" />
                <div className="h-8 animate-pulse rounded bg-muted" />
                <div className="h-8 animate-pulse rounded bg-muted" />
              </div>
            ) : error ? (
              <p className="mt-5 text-sm text-negative">{error}</p>
            ) : pulseVM.metrics.length === 0 ? (
              <p className="mt-5 text-sm text-muted-foreground">
                {DASHBOARD_PULSE_LABELS.EMPTY_HINT}
              </p>
            ) : (
              <dl className="mt-4 space-y-3">
                {pulseVM.metrics.map((metric) => (
                  <div key={metric.key} className="flex items-baseline justify-between gap-4">
                    <dt className="text-xs font-medium tracking-wider text-muted-foreground">
                      {metric.label}
                    </dt>
                    <dd
                      className={`font-mono text-sm tabular-nums ${metric.valueClassName || 'text-foreground'}`}
                    >
                      {metric.valueText}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </section>

          <button
            type="button"
            onClick={() => navigate('/close')}
            className="block w-full cursor-pointer rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-6 text-left transition-colors hover:bg-elevated/50"
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
        </div>
      </div>

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
    </div>
  );
};

export default Dashboard;
