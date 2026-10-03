import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { InteractiveLineChart } from '@/ui/components/charts/InteractiveLineChart';
import { toMonthTrendSeries } from '@/ui/components/charts/monthTrendSeries';
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
import { formatCurrency, formatMonthLabel, formatPercentage } from '@/ui/utils';

interface PortfolioDetailProps {
  householdId: string;
  portfolio: Portfolio;
}

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
      toMonthTrendSeries(
        snapshots.map((snapshot) => ({
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
              {formatMonthLabel(latestSnapshot.year, latestSnapshot.month)}
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
        {trend.hasData ? (
          <InteractiveLineChart
            values={trend.values}
            points={trend.points}
            xLabels={trend.labels}
            includeZero={false}
            yAxis="left"
            height={208}
            ariaLabel="12 month portfolio value trend"
          />
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
                  {formatMonthLabel(snapshot.year, snapshot.month)}
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
