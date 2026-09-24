import React from 'react';

import { DASHBOARD_CASHFLOW_LABELS } from '@/ui/constants/dashboard/cashFlowLabels';
import { mapCashFlowSeriesToChartVM } from '@/ui/features/dashboard/viewmodels/dashboardCashFlowChart.vm';
import type { DashboardCashFlowPoint } from '@/ui/features/dashboard/viewmodels/dashboardCashFlowChart.vm';

const CHART_WIDTH = 640;
const CHART_HEIGHT = 140;

interface CashFlowChartBlockProps {
  series: DashboardCashFlowPoint[];
  loading: boolean;
}

export const CashFlowChartBlock: React.FC<CashFlowChartBlockProps> = ({ series, loading }) => {
  const chartVM = mapCashFlowSeriesToChartVM(series);

  return (
    <section className="rounded-lg border border-border bg-elevated/30 backdrop-blur-sm p-6">
      <p className="text-xs font-medium tracking-widest text-muted-foreground">
        {DASHBOARD_CASHFLOW_LABELS.SECTION_TITLE}
      </p>
      {loading ? (
        <div className="mt-5 h-36 animate-pulse rounded bg-muted" />
      ) : !chartVM.hasData ? (
        <p className="mt-5 text-sm text-muted-foreground">{DASHBOARD_CASHFLOW_LABELS.EMPTY_HINT}</p>
      ) : (
        <div className="mt-5" data-testid="cashflow-chart">
          <div className="relative">
            <svg
              className="h-36 w-full"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <line
                x1="8"
                x2={CHART_WIDTH - 8}
                y1={chartVM.zeroY}
                y2={chartVM.zeroY}
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <path
                d={chartVM.path}
                fill="none"
                stroke="hsl(var(--chart-2))"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {chartVM.latest && (
                <circle
                  cx={chartVM.latest.x}
                  cy={chartVM.latest.y}
                  r="4"
                  fill="hsl(var(--chart-2))"
                />
              )}
            </svg>
          </div>
          <div className="relative mt-2 h-4">
            {chartVM.points.map((point, index) => {
              const showLabel =
                index === 0 ||
                index === chartVM.points.length - 1 ||
                index === Math.floor((chartVM.points.length - 1) / 2);
              if (!showLabel) return null;
              return (
                <span
                  key={point.label}
                  className="absolute whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground"
                  style={{
                    left: `${(point.x / CHART_WIDTH) * 100}%`,
                    transform:
                      index === 0
                        ? 'none'
                        : index === chartVM.points.length - 1
                          ? 'translateX(-100%)'
                          : 'translateX(-50%)',
                  }}
                >
                  {point.label}
                </span>
              );
            })}
          </div>
          <p className="mt-2 font-mono text-sm tabular-nums text-foreground">{chartVM.latestText}</p>
        </div>
      )}
    </section>
  );
};
