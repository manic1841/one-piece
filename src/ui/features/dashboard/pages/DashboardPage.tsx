import React from 'react';

import { useAuth } from '@/infra/contexts/useAuth';
import { useDashboardOverview } from '@/ui/features/dashboard/hooks/useDashboardOverview';
import { DASHBOARD_PULSE_LABELS } from '@/ui/constants/dashboard/pulseLabels';

const Dashboard: React.FC = () => {
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId;
  const { heroVM, pulseVM, loading, error } = useDashboardOverview(householdId);

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
      {pulseVM.metrics.length > 0 && (
        <section className="rounded-lg border border-border bg-elevated p-6 md:p-8">
          <p className="text-xs font-medium tracking-widest text-muted-foreground">
            {DASHBOARD_PULSE_LABELS.SECTION_TITLE}
          </p>
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
        </section>
      )}
    </div>
  );
};

export default Dashboard;
