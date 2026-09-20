import React, { useEffect, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { type AccountSnapshot, type AccountWithSnapshot } from '@/domains/account/types/account';
import { AccountCategoryLabels } from '@/ui/constants/account/label';
import { Badge } from '@/ui/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { PageHeader } from '@/ui/components/PageHeader';
import { useAuth } from '@/infra/contexts/useAuth';
import { getAccountsWithSnapshotsUseCase } from '@/application/account/use_cases/getAccountsWithSnapshotsUseCase';
import { getAccountHistoryUseCase } from '@/application/account/use_cases/getAccountHistoryUseCase';
import { formatCurrency, formatDate } from '@/ui/utils';

interface AccountDetailPageProps {
  account?: AccountWithSnapshot;
}

const MONTH_NAMES = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];

const TREND_WIDTH = 720;
const TREND_HEIGHT = 180;
const TREND_PADDING_X = 8;
const TREND_PADDING_TOP = 12;
const TREND_PADDING_BOTTOM = 24;

interface TrendGeometry {
  path: string | undefined;
  points: { x: number; y: number }[];
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

const buildTrendGeometry = (snapshots: AccountWithSnapshot['snapshot'][]): TrendGeometry => {
  const present = snapshots
    .filter((snapshot): snapshot is NonNullable<typeof snapshot> => snapshot !== null)
    .slice()
    .sort((a, b) => a.year - b.year || a.month - b.month);

  if (present.length === 0) {
    return { path: undefined, points: [], xLabels: [], yLabels: [] };
  }

  const values = present.map((snapshot) => snapshot.amount);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawSpan = rawMax - rawMin;
  const yMin = rawSpan === 0 ? rawMin * 0.9 : rawMin - rawSpan * 0.1;
  const yMax = rawSpan === 0 ? rawMax * 1.1 : rawMax + rawSpan * 0.1;
  const ySpan = yMax - yMin;
  const innerWidth = TREND_WIDTH - TREND_PADDING_X * 2;
  const innerHeight = TREND_HEIGHT - TREND_PADDING_TOP - TREND_PADDING_BOTTOM;

  const points = present.map((snapshot, index) => {
    const xRatio = present.length === 1 ? 1 : index / (present.length - 1);
    const yRatio = ySpan === 0 ? 0.5 : (snapshot.amount - yMin) / ySpan;
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

  return { path, points, xLabels, yLabels };
};

interface HoldingRowVM {
  id: string;
  symbol: string;
  name: string;
  costText: string;
  valueText: string;
  leverageText: string;
}

const toHoldingRowVM = (
  holding: NonNullable<AccountWithSnapshot['snapshot']>['holdings'] extends (infer H)[] | undefined
    ? H
    : never,
  index: number,
): HoldingRowVM => ({
  id: `${holding.symbol}-${index}`,
  symbol: holding.symbol,
  name: holding.name,
  costText: formatCurrency(holding.cost),
  valueText: formatCurrency(holding.marketValue),
  leverageText: `${(holding.leverage ?? 1).toFixed(2)}x`,
});

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
    {children}
  </p>
);

const AccountDetailPage: React.FC<AccountDetailPageProps> = ({ account }) => {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId ?? '';

  const [fetchedAccount, setFetchedAccount] = useState<AccountWithSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<AccountSnapshot[]>([]);

  const activeAccount = account ?? fetchedAccount;

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (account || !householdId) {
        setLoading(false);
        return;
      }
      try {
        const accounts = await getAccountsWithSnapshotsUseCase.execute({
          householdId,
          auth: {
            uid: userProfile?.uid ?? '',
            email: userProfile?.email,
          },
          includeInactive: true,
        });
        if (!ignore) {
          setFetchedAccount(accounts.find((a) => a.id === id) ?? null);
        }
      } catch {
        if (!ignore) setFetchedAccount(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [account, householdId, id, userProfile]);

  useEffect(() => {
    let ignore = false;
    const loadHistory = async () => {
      if (!householdId || !id) {
        return;
      }
      try {
        const snapshots = await getAccountHistoryUseCase.execute({
          householdId,
          accountId: id,
          auth: {
            uid: userProfile?.uid ?? '',
            email: userProfile?.email,
          },
        });
        if (!ignore) setHistory(snapshots);
      } catch {
        if (!ignore) setHistory([]);
      }
    };
    void loadHistory();
    return () => {
      ignore = true;
    };
  }, [householdId, id, userProfile]);

  const trend = useMemo(
    () => buildTrendGeometry(history),
    [history],
  );

  const holdings = useMemo(() => {
    const snapshotHoldings = activeAccount?.snapshot?.holdings ?? [];
    return snapshotHoldings.map((holding, index) => toHoldingRowVM(holding, index));
  }, [activeAccount?.snapshot]);

  const historyRows = useMemo(
    () => history.slice().reverse(),
    [history],
  );

  const isActive = activeAccount?.isActive !== false;

  if (loading) return <div>Loading...</div>;
  if (!activeAccount) return <div>Account not found</div>;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={activeAccount.name}
        crumb={`ACCOUNTS / ${AccountCategoryLabels[activeAccount.category].toUpperCase()}`}
        badge={
          <Badge variant="outline" className="font-mono">
            {activeAccount.currency}
          </Badge>
        }
        meta={!isActive && <p className="mt-1 text-xs text-muted-foreground">停用帳戶</p>}
      />

      <section className="space-y-3">
        <SectionTitle>BASIC INFO</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Account</p>
            <p className="font-medium">{activeAccount.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="font-medium">{AccountCategoryLabels[activeAccount.category]}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Currency</p>
            <p className="font-medium font-mono">{activeAccount.currency}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="font-medium font-mono text-[13px]">
              {formatDate(activeAccount.createdAt)}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>ENDING BALANCE</SectionTitle>
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-3xl tabular-nums text-foreground">
            {formatCurrency(activeAccount.snapshot?.amount ?? 0)}
          </p>
          {activeAccount.snapshot && (
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {MONTH_NAMES[activeAccount.snapshot.month - 1]} {activeAccount.snapshot.year}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>12M TREND</SectionTitle>
        {trend.path ? (
          <div className="relative" data-testid="account-trend-chart">
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
          <p className="text-sm text-muted-foreground">尚無結算資料，完成本月關帳後顯示趨勢</p>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>12M HISTORY</SectionTitle>
        {historyRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">目前尚無結算紀錄</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Ending Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyRows.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell className="font-mono text-[12px]">
                    {MONTH_NAMES[snapshot.month - 1]} {snapshot.year}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(snapshot.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      {holdings.length > 0 && (
        <section className="space-y-3">
          <SectionTitle>HOLDINGS</SectionTitle>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Leverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holdings.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-[12px]">{row.symbol}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.costText}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.valueText}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.leverageText}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
};

export default AccountDetailPage;
