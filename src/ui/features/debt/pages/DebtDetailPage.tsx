import React from 'react';

import { Pencil, Power, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { DEBT_STATUS_SETTLED_LABEL } from '@/ui/constants/debtStatusLabels';
import { Button } from '@/ui/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import { DebtAccountForm } from '@/ui/features/debt/components/DebtAccountForm';
import { DebtPaymentsTable } from '@/ui/features/debt/components/detail/DebtPaymentsTable';
import { DebtSnapshotTable } from '@/ui/features/debt/components/detail/DebtSnapshotTable';
import { DebtTrendChart } from '@/ui/features/debt/components/detail/DebtTrendChart';
import { useDebtDetailPage } from '@/ui/features/debt/hooks/useDebtDetailPage';
import { type DebtAccount } from '@/ui/features/debt/viewmodels/debtDisplay.vm';
import { formatCurrency, formatDate } from '@/ui/utils';

interface DebtDetailPageProps {
  account?: DebtAccount;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
    {children}
  </p>
);

export default function DebtDetailPage({ account }: DebtDetailPageProps) {
  const navigate = useNavigate();
  const {
    activeAccount,
    snapshots,
    history,
    trend,
    loading,
    isEditOpen,
    setIsEditOpen,
    formVm,
    handleDisable,
    handleDelete,
    handleEnable,
  } = useDebtDetailPage({ account });

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
            <StatusGlyph type="verified" label={DEBT_STATUS_SETTLED_LABEL} />
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
        <DebtTrendChart trend={trend} />
      </section>

      <section className="space-y-3">
        <SectionTitle>12M HISTORY</SectionTitle>
        <DebtSnapshotTable snapshots={snapshots} />
      </section>

      <section className="space-y-3">
        <SectionTitle>RECENT PAYMENTS</SectionTitle>
        <DebtPaymentsTable history={history} />
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
