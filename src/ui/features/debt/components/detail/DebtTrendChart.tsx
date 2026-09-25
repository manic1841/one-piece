import React from 'react';

import {
  TREND_HEIGHT,
  TREND_PADDING_X,
  TREND_WIDTH,
  type TrendGeometry,
} from './debtTrendGeometry';

interface DebtTrendChartProps {
  trend: TrendGeometry;
}

export const DebtTrendChart: React.FC<DebtTrendChartProps> = ({ trend }) => {
  if (!trend.path) {
    return <p className="text-sm text-muted-foreground">尚無月度結算資料</p>;
  }

  return (
    <div className="relative" data-testid="debt-trend-chart">
      <svg
        className="h-44 w-full"
        viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {trend.yLabels.map((label) => (
          <line
            key={label.text}
            x1={TREND_PADDING_X}
            x2={TREND_WIDTH - TREND_PADDING_X}
            y1={label.y}
            y2={label.y}
            stroke="hsl(var(--border))"
            strokeWidth="1"
          />
        ))}
        <path
          d={trend.path}
          fill="none"
          stroke="hsl(var(--chart-1))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="relative mt-2 h-4">
        {trend.xLabels.map((label) => (
          <span
            key={label.text}
            className="absolute whitespace-nowrap font-mono text-[10px] tabular-nums text-muted-foreground"
            style={{ left: `${(label.x / TREND_WIDTH) * 100}%` }}
          >
            {label.text}
          </span>
        ))}
      </div>
    </div>
  );
};
