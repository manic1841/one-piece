import React from 'react';

import { Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
import {
  MONTH_NAMES,
} from '@/ui/features/account/components/detail/accountTrendGeometry';
import AccountTrendChart from '@/ui/features/account/components/detail/AccountTrendChart';
import { useAccountDetailPage } from '@/ui/features/account/hooks/useAccountDetailPage';
import { type AccountWithSnapshot } from '@/ui/features/account/viewmodels/account.vm';
import { formatCurrency, formatDate } from '@/ui/utils';

interface AccountDetailPageProps {
  account?: AccountWithSnapshot;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
    {children}
  </p>
);

const AccountDetailPage: React.FC<AccountDetailPageProps> = ({ account }) => {
  const navigate = useNavigate();
  const { activeAccount, loading, isActive, trend, holdings, historyRows, handleToggleActive } =
    useAccountDetailPage({ account });

  if (loading) return <div>Loading...</div>;
  if (!activeAccount) return <div>Account not found</div>;

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
