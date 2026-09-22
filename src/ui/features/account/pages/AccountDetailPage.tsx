import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Power } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { type AccountSnapshot, type AccountWithSnapshot } from '@/domains/account/types/account';
import { AccountCategoryLabels } from '@/ui/constants/account/label';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
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
import { checkAccountMonthlyUsageUseCase } from '@/application/account/use_cases/checkAccountMonthlyUsageUseCase';
import { useConfirm } from '@/ui/features/app/confirm/ConfirmDialog';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import {
  MONTH_NAMES,
  buildTrendGeometry,
} from '@/ui/features/account/components/detail/accountTrendGeometry';
import AccountTrendChart from '@/ui/features/account/components/detail/AccountTrendChart';
import { formatCurrency, formatDate } from '@/ui/utils';

interface AccountDetailPageProps {
  account?: AccountWithSnapshot;
}

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
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId ?? '';
  const { confirm } = useConfirm();
  const { updateAccount } = useAccountCmds(householdId);

  const [fetchedAccount, setFetchedAccount] = useState<AccountWithSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<AccountSnapshot[]>([]);
  const [statusOverride, setStatusOverride] = useState<boolean | null>(null);

  const activeAccount = account ?? fetchedAccount;
  const activeId = activeAccount?.id ?? null;

  const refetchAccount = useCallback(async () => {
    if (account || !householdId) return;
    try {
      const accounts = await getAccountsWithSnapshotsUseCase.execute({
        householdId,
        auth: {
          uid: userProfile?.uid ?? '',
          email: userProfile?.email,
        },
        includeInactive: true,
      });
      setFetchedAccount(accounts.find((a) => a.id === id) ?? null);
    } catch {
      setFetchedAccount(null);
    }
  }, [account, householdId, id, userProfile]);

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
    () =>
      buildTrendGeometry(
        history.map((snapshot) => ({ year: snapshot.year, month: snapshot.month, value: snapshot.amount })),
      ),
    [history],
  );

  useEffect(() => {
    setStatusOverride(null);
  }, [activeId]);

  const holdings = useMemo(() => {
    const snapshotHoldings = activeAccount?.snapshot?.holdings ?? [];
    return snapshotHoldings.map((holding, index) => toHoldingRowVM(holding, index));
  }, [activeAccount?.snapshot]);

  const historyRows = useMemo(
    () => history.slice().reverse(),
    [history],
  );

  const isActive = statusOverride ?? activeAccount?.isActive !== false;

  if (loading) return <div>Loading...</div>;
  if (!activeAccount) return <div>Account not found</div>;

  const handleToggleActive = async () => {
    const nextActive = !isActive;

    if (!nextActive) {
      const now = new Date();
      const warning = await checkAccountMonthlyUsageUseCase.execute({
        householdId,
        accountId: activeAccount.id,
        accountCategory: activeAccount.category,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        auth: {
          uid: userProfile?.uid ?? '',
          email: userProfile?.email,
        },
      });

      if (warning.hasReferences) {
        const confirmed = await confirm({
          title: 'Disable this account?',
          context: `It has ${warning.referenceCount} transactions this month.`,
          consequence: 'Disabled accounts no longer appear in bookkeeping or month-end settlement menus.',
          confirmLabel: 'DISABLE',
          cancelLabel: 'Cancel',
        });
        if (!confirmed) return;
      }
    }

    const updated = await updateAccount(activeAccount.id, { isActive: nextActive });
    if (updated === undefined) {
      return;
    }
    setStatusOverride(nextActive);
    if (!account) {
      await refetchAccount();
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={activeAccount.name}
        crumb={`ACCOUNTS / ${AccountCategoryLabels[activeAccount.category].toUpperCase()}`}
        onBack={() => navigate('/accounts')}
        badge={
          <Badge variant="outline" className="font-mono">
            {activeAccount.currency}
          </Badge>
        }
        meta={!isActive && <p className="mt-1 text-xs text-muted-foreground">停用帳戶</p>}
        actions={
          <div className="flex gap-2">
            {isActive ? (
              <Button variant="outline" onClick={() => void handleToggleActive()}>
                <Power size={16} />
                停用帳戶
              </Button>
            ) : (
              <Button variant="outline" onClick={() => void handleToggleActive()}>
                啟用帳戶
              </Button>
            )}
          </div>
        }
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
          <AccountTrendChart trend={trend} />
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
