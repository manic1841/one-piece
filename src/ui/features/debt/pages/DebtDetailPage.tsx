import { Pencil, Power, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { Module } from '@/ui/components/Module';
import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { InteractiveLineChart } from '@/ui/components/charts/InteractiveLineChart';
import { Button } from '@/ui/components/ui/button';
import { DEBT_STATUS_INACTIVE_LABEL, DEBT_STATUS_SETTLED_LABEL } from '@/ui/constants/debt/label';
import { DebtAccountFormDialog } from '@/ui/features/debt/components/DebtAccountFormDialog';
import { DebtHistoryTable } from '@/ui/features/debt/components/detail/DebtHistoryTable';
import { useDebtDetailPage } from '@/ui/features/debt/hooks/useDebtDetailPage';
import { type DebtAccount } from '@/ui/features/debt/viewmodels/debtDisplay.vm';
import { formatCurrency, formatDate } from '@/ui/utils';

interface DebtDetailPageProps {
  account?: DebtAccount;
}

const SKELETON_ROWS = [0, 1, 2];

export default function DebtDetailPage({ account }: DebtDetailPageProps) {
  const navigate = useNavigate();
  const {
    activeAccount,
    isSettled,
    historyMonths,
    trend,
    loading,
    isEditOpen,
    setIsEditOpen,
    formVm,
    handleDisable,
    handleDelete,
    handleEnable,
  } = useDebtDetailPage({ account });

  if (loading) {
    return (
      <div role="status" className="space-y-6 pb-20">
        <span className="sr-only">載入中…</span>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-16" />
        ))}
      </div>
    );
  }

  if (!activeAccount) {
    return (
      <EmptyState
        title="找不到貸款"
        description="此貸款可能已被刪除，或你不屬於它所屬的家庭。"
        action={
          <Button variant="outline" onClick={() => navigate('/debt')}>
            返回債務列表
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={activeAccount.name}
        description={`年利率 ${activeAccount.interestRate}%`}
        crumb="DEBT"
        onBack={() => navigate('/debt')}
        badge={
          !activeAccount.isActive ? (
            <StatusGlyph
              type={isSettled ? 'verified' : 'inactive'}
              label={isSettled ? DEBT_STATUS_SETTLED_LABEL : DEBT_STATUS_INACTIVE_LABEL}
            />
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
                <Pencil size={16} aria-hidden="true" />
                編輯貸款
              </Button>
            )}
            {activeAccount.isActive && (
              <Button variant="destructive" onClick={() => void handleDisable()}>
                <Power size={16} aria-hidden="true" />
                停用貸款
              </Button>
            )}
          </div>
        }
      />

      <PageSection title="OUTSTANDING BALANCE" spacing="compact">
        <div className="flex items-baseline justify-between">
          <FinancialNumber
            value={formatCurrency(activeAccount.currentBalance)}
            size="large"
            tone="negative"
          />
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            / {formatCurrency(activeAccount.originalAmount)}
          </span>
        </div>
      </PageSection>

      <PageSection title="LOAN INFORMATION" spacing="compact">
        <MetricGroup columns={4}>
          <Metric label="Original" value={formatCurrency(activeAccount.originalAmount)} />
          <Metric label="Monthly Payment" value={formatCurrency(activeAccount.monthlyPayment)} />
          <Metric label="Interest Rate" value={`${activeAccount.interestRate}%`} />
          <Metric
            label="Period"
            value={`${formatDate(activeAccount.startDate)} ~ ${formatDate(activeAccount.endDate)}`}
          />
        </MetricGroup>
      </PageSection>

      <PageSection title="12M TREND" spacing="compact">
        {trend.hasData ? (
          <InteractiveLineChart
            values={trend.values}
            points={trend.points}
            xLabels={trend.labels}
            includeZero={false}
            yAxis="left"
            height={208}
            ariaLabel="12 month loan balance trend"
          />
        ) : (
          <p className="text-sm text-muted-foreground">尚無月度結算資料</p>
        )}
      </PageSection>

      <PageSection title="HISTORY" spacing="compact">
        <DebtHistoryTable months={historyMonths} />
      </PageSection>

      <PageSection spacing="compact">
        <Module label="DANGER ZONE">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void handleDelete()}
          >
            <Trash2 size={14} aria-hidden="true" />
            刪除貸款
          </Button>
        </Module>
      </PageSection>

      <DebtAccountFormDialog
        open={isEditOpen}
        onOpenChange={(open) => !open && setIsEditOpen(false)}
        title="編輯貸款"
        vm={formVm}
      />
    </div>
  );
}
