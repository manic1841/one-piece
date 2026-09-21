import React, { useEffect, useMemo, useState } from 'react';

import { ListOrdered, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { type PortfolioSnapshot } from '@/domains/portfolio/types/portfolio';
import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { useAccounts } from '@/ui/features/account/hooks/useAccounts';
import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { usePortfolioCmds } from '@/ui/features/portfolio/hooks/usePortfolioCmds';
import { usePortfolios } from '@/ui/features/portfolio/hooks/usePortfolios';
import {
  type PortfolioFormVM,
  mapPortfolioVMToDomain,
} from '@/ui/features/portfolio/viewmodels/portfolioForm.vm';
import { formatCurrency, formatPercentage, formatYearMonth } from '@/ui/utils';

import PortfolioForm from './PortfolioForm';

interface PortfolioListProps {
  householdId: string;
}

interface PortfolioRowVM {
  id: string;
  name: string;
  securitiesName: string;
  bankName: string;
  valueText: string;
  returnRate: number | null;
  asOfText: string | null;
  isActive: boolean;
}

const PortfolioList: React.FC<PortfolioListProps> = ({ householdId }) => {
  const navigate = useNavigate();
  const auth = useAuthContext();
  const { portfolios, latestSnapshots, reload } = usePortfolios(householdId);
  const { fetchAccounts } = useAccounts();
  const { createPortfolio, reorderPortfolios } = usePortfolioCmds(
    householdId,
    auth.email || '',
    reload,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [localPortfolios, setLocalPortfolios] = useState(portfolios);
  const [accountNames, setAccountNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setLocalPortfolios(portfolios);
  }, [portfolios]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const accounts = await fetchAccounts(householdId, auth, { includeInactive: true });
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

  const overview = useMemo(() => {
    const snapshots: PortfolioSnapshot[] = localPortfolios
      .map((portfolio) => latestSnapshots.get(portfolio.id))
      .filter((snapshot): snapshot is PortfolioSnapshot => snapshot !== undefined);

    const totalValue = snapshots.reduce((sum, snapshot) => sum + snapshot.totalValue, 0);
    const totalCumulativeGain = snapshots.reduce(
      (sum, snapshot) => sum + snapshot.performance.cumulativeGain,
      0,
    );
    const totalInvested = totalValue - totalCumulativeGain;
    const totalReturnRate = totalInvested > 0 ? (totalCumulativeGain / totalInvested) * 100 : 0;

    const latestPeriod = snapshots.reduce<{ year: number; month: number } | null>(
      (latest, snapshot) => {
        if (!latest) {
          return { year: snapshot.year, month: snapshot.month };
        }
        if (
          snapshot.year > latest.year ||
          (snapshot.year === latest.year && snapshot.month > latest.month)
        ) {
          return { year: snapshot.year, month: snapshot.month };
        }
        return latest;
      },
      null,
    );

    return {
      totalValue,
      totalReturnRate,
      snapshotsCount: snapshots.length,
      latestPeriodLabel: latestPeriod
        ? formatYearMonth(latestPeriod.year, latestPeriod.month)
        : null,
    };
  }, [localPortfolios, latestSnapshots]);

  const saveOrder = async () => {
    const orders = localPortfolios.map((p, index) => ({
      id: p.id,
      order: index,
    }));
    await reorderPortfolios(orders);
    setIsReorderMode(false);
    reload();
  };

  const handleCreateSubmit = async (vm: PortfolioFormVM) => {
    await createPortfolio(mapPortfolioVMToDomain(vm));
  };

  const rows: PortfolioRowVM[] = localPortfolios
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map((portfolio) => {
      const snapshot = latestSnapshots.get(portfolio.id);
      return {
        id: portfolio.id,
        name: portfolio.name,
        securitiesName: accountNames.get(portfolio.securitiesAccountId) ?? '—',
        bankName: accountNames.get(portfolio.bankAccountId) ?? '—',
        valueText: formatCurrency(snapshot?.totalValue ?? 0),
        returnRate: snapshot ? snapshot.performance.cumulativeReturnRate : null,
        asOfText: snapshot ? formatYearMonth(snapshot.year, snapshot.month) : null,
        isActive: portfolio.isActive !== false,
      };
    });

  return (
    <div className="space-y-8">
      <PageHeader
        title="投資組合"
        description="分析投資表現：一個證券帳戶連結一個銀行帳戶"
        actions={
          isReorderMode ? (
            <div className="flex gap-2">
              <Button onClick={saveOrder}>儲存順序</Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsReorderMode(false);
                  setLocalPortfolios(portfolios);
                }}
              >
                取消
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsReorderMode(true)}
                className="gap-2"
                disabled={portfolios.length < 2}
              >
                <ListOrdered size={18} />
                排序
              </Button>
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus size={18} />
                新增組合
              </Button>
            </div>
          )
        }
      />

      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          TOTAL PORTFOLIO VALUE
        </p>
        <p className="font-mono text-2xl tabular-nums text-foreground">
          {formatCurrency(overview.totalValue)}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Securities</TableHead>
            <TableHead>Bank</TableHead>
            <TableHead className="text-right">Portfolio Value</TableHead>
            <TableHead className="text-right">Return</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              onClick={() => !isReorderMode && navigate(`/portfolios/${row.id}`)}
              className={isReorderMode ? '' : 'cursor-pointer'}
              data-testid={`portfolio-row-${row.id}`}
            >
              <TableCell className={row.isActive ? '' : 'text-muted-foreground'}>
                {row.name}
              </TableCell>
              <TableCell className="text-muted-foreground">{row.securitiesName}</TableCell>
              <TableCell className="text-muted-foreground">{row.bankName}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{row.valueText}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">
                {row.returnRate === null ? '—' : formatPercentage(row.returnRate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PortfolioForm
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        householdId={householdId}
      />
    </div>
  );
};

export default PortfolioList;
