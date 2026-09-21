import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Pencil, Power, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  type DebtAccount,
  type DebtSnapshot,
} from '@/domains/debt/schemas';
import { debtSnapshotRepository } from '@/infra/repositories/debtSnapshotRepository';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { PageHeader } from '@/ui/components/PageHeader';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { useAuth } from '@/infra/contexts/useAuth';
import { useConfirm } from '@/ui/features/app/confirm/ConfirmDialog';
import { DebtAccountForm } from '@/ui/features/debt/components/DebtAccountForm';
import { useDebtAccountCmds } from '@/ui/features/debt/hooks/useDebtAccountCmds';
import { useDebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';
import { useProjects } from '@/ui/features/project/hooks/useProjects';
import { formatCurrency, formatDate } from '@/ui/utils';

interface DebtDetailPageProps {
  account?: DebtAccount;
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

interface PaymentHistoryRow {
  id: string;
  dateText: string;
  descriptionText: string;
  principalText: string;
  interestText: string;
  totalText: string;
}

export default function DebtDetailPage({ account }: DebtDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId ?? '';
  const { confirm } = useConfirm();
  const { updateDebtAccount, removeDebtAccount } = useDebtAccountCmds(householdId);
  const { projects } = useProjects(householdId);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [fetchedAccount, setFetchedAccount] = useState<DebtAccount | null>(null);
  const [snapshots, setSnapshots] = useState<DebtSnapshot[]>([]);
  const [history, setHistory] = useState<PaymentHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const activeAccount = account ?? fetchedAccount;

  const fetchAccount = useCallback(async () => {
    if (account || !householdId) return;
    const accounts = await listDebtAccountsUseCase.execute({
      householdId,
      includeInactive: true,
    });
    setFetchedAccount(accounts.find((a) => a.id === id) ?? null);
  }, [account, householdId, id]);

  const formVm = useDebtAccountFormViewModel({
    householdId,
    initialAccount: activeAccount ?? undefined,
    projects,
    submitLabel: '儲存',
    onSubmitSuccess: () => {
      setIsEditOpen(false);
      void fetchAccount();
    },
    onCancel: () => setIsEditOpen(false),
  });

  const handleDisable = async () => {
    if (!activeAccount) return;
    const confirmed = await confirm({
      title: 'Disable this loan?',
      context: 'It will be hidden from the debt list and excluded from totals.',
      consequence: 'You can re-enable it later from the edit dialog.',
      confirmLabel: 'DISABLE',
    });
    if (!confirmed) return;
    await updateDebtAccount(activeAccount.id, { isActive: false });
    await fetchAccount();
  };

  const handleDelete = async () => {
    if (!activeAccount) return;
    const confirmed = await confirm({
      title: 'Delete this loan?',
      consequence: 'This action cannot be undone.',
    });
    if (!confirmed) return;
    await removeDebtAccount(activeAccount.id);
    navigate('/debt');
  };

  const handleEnable = async () => {
    if (!activeAccount) return;
    await updateDebtAccount(activeAccount.id, { isActive: true });
    await fetchAccount();
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (account || !householdId) {
        setLoading(false);
        return;
      }
      await fetchAccount();
      if (!ignore) {
        setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [account, householdId, id, fetchAccount]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      if (!id || !householdId) {
        setLoading(false);
        return;
      }
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const startYearMonth = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
      const endYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const data = await debtSnapshotRepository.listByYearMonthRange(
        householdId,
        id,
        startYearMonth,
        endYearMonth,
      );
      if (!ignore) {
        setSnapshots(data);
        setLoading(false);
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [householdId, id]);

  const trend = useMemo(
    () =>
      buildTrendGeometry(
        snapshots
          .slice()
          .reverse()
          .map((snapshot) => {
            const [year, month] = snapshot.yearMonth.split('-').map(Number);
            return { year, month, value: snapshot.closingBalance };
          }),
      ),
    [snapshots],
  );

  useEffect(() => {
    let mounted = true;
    if (!activeAccount) return;
    void (async () => {
      try {
        const { listDebtPaymentsUseCase } = await import(
          '@/application/debt/use_cases/listDebtPaymentsUseCase'
        );
        const transactions = await listDebtPaymentsUseCase.execute({
          householdId,
          debtAccountId: activeAccount.id,
          auth: {
            uid: userProfile?.uid ?? '',
            email: userProfile?.email,
          },
        });
        if (!mounted) return;
        setHistory(
          transactions.map((transaction) => {
            const principal =
              transaction.entries.find((entry) =>
                entry.ledgerCode.startsWith('liability:'),
              )?.debit || 0;
            const interest =
              transaction.entries.find((entry) => entry.ledgerCode === 'expense:interest')?.debit ||
              0;
            const total = transaction.entries.reduce((sum, entry) => sum + (entry.debit || 0), 0);
            return {
              id: transaction.id,
              dateText: formatDate(transaction.date),
              descriptionText: (transaction as { note?: string }).note || '還款',
              principalText: formatCurrency(principal),
              interestText: formatCurrency(interest),
              totalText: formatCurrency(total),
            };
          }),
        );
      } catch {
        if (mounted) setHistory([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeAccount, householdId, userProfile]);

  if (loading) return <div>Loading...</div>;
  if (!activeAccount) return <div>Loan not found</div>;

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={activeAccount.name}
        description={`年利率 ${activeAccount.interestRate}%`}
        crumb="DEBT"
        onBack={() => navigate('/debt')}
        badge={
          !activeAccount.isActive ? (
            <Badge variant="outline" className="font-mono">
              已結清
            </Badge>
          ) : undefined
        }
        actions={
          <div className="flex gap-2">
            {!activeAccount.isActive ? (
              <Button variant="outline" onClick={() => void handleEnable()}>
                啟用貸款
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                <Pencil size={16} />
                編輯貸款
              </Button>
            )}
            {activeAccount.isActive && (
              <Button variant="outline" onClick={() => void handleDisable()}>
                <Power size={16} />
                停用貸款
              </Button>
            )}
          </div>
        }
      />

      <section className="space-y-3">
        <SectionTitle>OUTSTANDING BALANCE</SectionTitle>
        <div className="flex items-baseline justify-between">
          <p className="font-mono text-3xl tabular-nums text-destructive">
            {formatCurrency(activeAccount.currentBalance)}
          </p>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            / {formatCurrency(activeAccount.originalAmount)}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>LOAN INFORMATION</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Original</p>
            <p className="font-mono tabular-nums">
              {formatCurrency(activeAccount.originalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly Payment</p>
            <p className="font-mono tabular-nums">{formatCurrency(activeAccount.monthlyPayment)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Interest Rate</p>
            <p className="font-mono tabular-nums">{activeAccount.interestRate}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Period</p>
            <p className="font-mono text-[12px] tabular-nums">
              {formatDate(activeAccount.startDate)} ~ {formatDate(activeAccount.endDate)}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>12M TREND</SectionTitle>
        {trend.path ? (
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
        ) : (
          <p className="text-sm text-muted-foreground">尚無月度結算資料</p>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>12M HISTORY</SectionTitle>
        {snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground">目前尚無月度資料</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">Closing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => (
                <TableRow key={snapshot.id}>
                  <TableCell className="font-mono text-[12px]">{snapshot.yearMonth}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(snapshot.openingBalance)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(snapshot.principalPaid)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(snapshot.interestPaid)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(snapshot.closingBalance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle>RECENT PAYMENTS</SectionTitle>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">目前尚無還款紀錄</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-[12px]">{item.dateText}</TableCell>
                  <TableCell className="text-muted-foreground">{item.descriptionText}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {item.principalText}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {item.interestText}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {item.totalText}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <SectionTitle>DANGER ZONE</SectionTitle>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void handleDelete()}
        >
          <Trash2 size={14} />
          刪除貸款
        </Button>
      </section>

      <Dialog open={isEditOpen} onOpenChange={(open) => !open && setIsEditOpen(false)}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>編輯貸款</DialogTitle>
          </DialogHeader>
          <DebtAccountForm vm={formVm} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
