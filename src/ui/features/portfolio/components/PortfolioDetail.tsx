import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { usePortfolioQueries } from '@/ui/features/portfolio/hooks/usePortfolios';
import {
  type Portfolio,
  type PortfolioSnapshot,
} from '@/ui/features/portfolio/viewmodels/portfolioDisplay.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { formatCurrency, formatPercentage } from '@/ui/utils';

interface PortfolioDetailProps {
  householdId: string;
  portfolio: Portfolio;
}

const MONTH_NAMES = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

const TREND_WIDTH = 720;
const TREND_HEIGHT = 180;
const TREND_PADDING_X = 8;
const TREND_PADDING_TOP = 12;
const TREND_PADDING_BOTTOM = 24;

interface TrendGeometry {
  path: string | undefined;
  xLabels: { x: number; text: string }[];
  yLabels: { y: number; text: string }[];
}

const formatTrendValue = (value: number): string => {
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }
  return `${Math.round(value)}`;
};

const buildTrendGeometry = (
  series: { year: number; month: number; value: number }[],
): TrendGeometry => {
  const present = series.slice().sort((a, b) => a.year - b.year || a.month - b.month);
  if (present.length === 0) {
    return { path: undefined, xLabels: [], yLabels: [] };
  }

  const values = present.map((item) => item.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin;
  const yMin = rawSpan === 0 ? rawMin * 0.9 : rawMin - rawSpan * 0.1;
  const yMax = rawSpan === 0 ? rawMax * 1.1 : rawMax + rawSpan * 0.1;
  const ySpan = yMax - yMin;
  const innerWidth = TREND_WIDTH - TREND_PADDING_X * 2;
  const innerHeight = TREND_HEIGHT - TREND_PADDING_TOP - TREND_PADDING_BOTTOM;

  const points = present.map((item, index) => {
    const xRatio = present.length === 1 ? 1 : index / (present.length - 1);
    const yRatio = ySpan === 0 ? 0.5 : (item.value - yMin) / ySpan;
    return {
      x: TREND_PADDING_X + xRatio * innerWidth,
      y: TREND_PADDING_TOP + (1 - yRatio) * innerHeight,
    };
  });

  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');

  const xLabelStep = Math.max(1, Math.ceil(present.length / 3));
  const xLabels: { x: number; text: string }[] = [];
  for (let index = 0; index < present.length; index += 1) {
    const isLast = index === present.length - 1;
    if (!isLast && index % xLabelStep !== 0) continue;
    xLabels.push({
      x: points[index].x,
      text: `${MONTH_NAMES[present[index].month - 1]} ${present[index].year}`,
    });
  }

  const yLabels = [0, 1, 2, 3].map((step) => {
    const value = yMin + (ySpan * step) / 3;
    return {
      y: TREND_PADDING_TOP + (1 - step / 3) * innerHeight,
      text: formatTrendValue(value),
    };
  });

  return { path, xLabels, yLabels };
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
    {children}
  </p>
);

const PortfolioDetail: React.FC<PortfolioDetailProps> = ({ householdId, portfolio }) => {
  const { fetchAccounts } = useAccounts();
  const auth = useAuthIdentity();
  const { getSnapshots, loading: queryLoading } = usePortfolioQueries(householdId);

  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [accountNames, setAccountNames] = useState<Map<string, string>>(new Map());

  const refreshSnapshots = useCallback(async () => {
    if (!portfolio.id) return;

    setLoadingSnapshots(true);
    try {
      const res = await getSnapshots(portfolio.id);
      if (res.ok) {
        setSnapshots(res.value);
      }
    } finally {
      setLoadingSnapshots(false);
    }
  }, [portfolio.id, getSnapshots]);

  React.useEffect(() => {
    refreshSnapshots();
  }, [refreshSnapshots]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const accountsResult = await fetchAccounts(householdId, auth, { includeInactive: true });
      const accounts = accountsResult.ok ? accountsResult.value : [];
      if (!ignore) {
        const names = new Map<string, string>();
        for (const account of accounts) {
          names.set(account.id, account.name);
        }
        setAccountNames(names);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [householdId, fetchAccounts, auth]);

  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  const breakdown = useMemo(() => {
    const openingValue = latestSnapshot?.performance.openingValue ?? 0;
    const closingValue = latestSnapshot?.performance.closingValue ?? 0;
    const deposits = latestSnapshot?.cashFlow.deposits ?? 0;
    const withdrawals = latestSnapshot?.cashFlow.withdrawals ?? 0;
    const investmentCashFlow = deposits - withdrawals;
    const calculatedReturn = closingValue - openingValue - investmentCashFlow;
    const investedBase = closingValue - investmentCashFlow - calculatedReturn;
    const returnRate = investedBase > 0 ? (calculatedReturn / investedBase) * 100 : 0;

    return {
      openingValue,
      closingValue,
      deposits,
      withdrawals,
      investmentCashFlow,
      calculatedReturn,
      returnRate,
    };
  }, [latestSnapshot]);

  const trend = useMemo(
    () =>
      buildTrendGeometry(
        snapshots
          .slice()
          .reverse()
          .map((snapshot) => ({
            year: snapshot.year,
            month: snapshot.month,
            value: snapshot.totalValue,
          })),
      ),
    [snapshots],
  );

  if (queryLoading || loadingSnapshots) return <div>Loading...</div>;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionTitle>PORTFOLIO VALUE</SectionTitle>
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-3xl tabular-nums text-foreground">
            {formatCurrency(latestSnapshot?.totalValue ?? 0)}
          </p>
          {latestSnapshot && (
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {MONTH_NAMES[latestSnapshot.month - 1]} {latestSnapshot.year}
            </p>
          )}
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>VALUE BREAKDOWN</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Securities</p>
            <p className="font-medium font-mono tabular-nums">
              {accountNames.get(portfolio.securitiesAccountId) ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bank</p>
            <p className="font-medium font-mono tabular-nums">
              {accountNames.get(portfolio.bankAccountId) ?? '—'}
            </p>
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>RETURN</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Monthly</p>
            <p className="font-mono tabular-nums">
              {latestSnapshot ? formatPercentage(latestSnapshot.performance.returnRate, 2) : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cumulative</p>
            <p className="font-mono tabular-nums">
              {latestSnapshot
                ? formatPercentage(latestSnapshot.performance.cumulativeReturnRate, 2)
                : '—'}
            </p>
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <SectionTitle>12M PORTFOLIO VALUE</SectionTitle>
        {trend.path ? (
          <div className="relative" data-testid="portfolio-trend-chart">
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
        ) : (
          <p className="text-sm text-muted-foreground">尚無快照資料</p>
        )}
      </section>
      <section className="space-y-3">
        <SectionTitle>MONTHLY PERFORMANCE</SectionTitle>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="text-right">Return</TableHead>
              <TableHead className="text-right">Cumulative %</TableHead>
              <TableHead className="text-right">Net Flow</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snapshots.map((snapshot) => (
              <TableRow key={snapshot.id}>
                <TableCell className="font-mono text-[12px]">
                  {MONTH_NAMES[snapshot.month - 1]} {snapshot.year}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(snapshot.totalValue)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatPercentage(snapshot.performance.returnRate, 2)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatPercentage(snapshot.performance.cumulativeReturnRate, 2)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatCurrency(snapshot.performance.netCashFlow)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <Accordion type="single" collapsible>
        <AccordionItem value="return-calculation">
          <AccordionTrigger>RETURN CALCULATION</AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Previous Portfolio Value</p>
                <p className="font-mono tabular-nums">{formatCurrency(breakdown.openingValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Portfolio Value</p>
                <p className="font-mono tabular-nums">{formatCurrency(breakdown.closingValue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Investment Cash Flow</p>
                <p className="font-mono tabular-nums">
                  {formatCurrency(breakdown.investmentCashFlow)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Non-investment Cash Flow</p>
                <p className="font-mono tabular-nums">$0</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Calculated Return</p>
                <p className="font-mono tabular-nums">
                  {formatCurrency(breakdown.calculatedReturn)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Return Rate</p>
                <p className="font-mono tabular-nums">
                  {formatPercentage(breakdown.returnRate, 2)}
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default PortfolioDetail;
