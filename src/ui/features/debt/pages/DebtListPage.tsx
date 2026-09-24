import { useState } from 'react';

import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { type DebtAccount } from '@/ui/features/debt/viewmodels/debtDisplay.vm';
import { useAuthState } from '@/ui/contexts/useAuthState';
import CompactRow from '@/ui/components/CompactRow';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { DEBT_STATUS_GRACE_PERIOD_LABEL } from '@/ui/constants/debtStatusLabels';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { PageHeader } from '@/ui/components/PageHeader';
import { formatCurrency, formatDate } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';
import { DebtAccountForm } from '@/ui/features/debt/components/DebtAccountForm';
import { useDebtPage } from '@/ui/features/debt/hooks/useDebtPage';
import { useDebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';

type DialogMode = 'create' | 'edit';

export default function DebtListPage() {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const navigate = useNavigate();

  const {
    debtAccountViews,
    projects,
    totalDebt,
    loading,
    error,
    reload,
  } = useDebtPage(householdId);

  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [editTarget, setEditTarget] = useState<DebtAccount | null>(null);
  const [showSettled, setShowSettled] = useState(false);

  const openCreate = () => {
    setEditTarget(null);
    setDialogMode('create');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditTarget(null);
  };

  const formVm = useDebtAccountFormViewModel({
    householdId,
    initialAccount: editTarget ?? undefined,
    projects,
    submitLabel: dialogMode === 'create' ? '新增' : '儲存',
    onSubmitSuccess: () => {
      closeDialog();
      reload();
    },
    onCancel: closeDialog,
  });

  const visibleAccounts = debtAccountViews
    .filter((a) => (showSettled ? true : a.isActive))
    .slice()
    .sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });

  return (
    <div className="space-y-8">
      <PageHeader
        title="債務管理"
        description="追蹤所有貸款與還款進度"
        actions={
          <div className="flex gap-2">
            <Button onClick={openCreate} className="gap-2">
              <Plus size={18} />
              新增貸款
            </Button>
          </div>
        }
      />

      {loading && <p className="text-muted-foreground">載入中…</p>}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
      )}

      {!loading && (
        <>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-3 text-xs text-muted-foreground">
              <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
                TOTAL OUTSTANDING
              </p>
              <button
                type="button"
                className="underline underline-offset-2 transition-[color,background-color,transform] duration-fast ease-out-quint hover:text-foreground active:scale-[0.97]"
                onClick={() => setShowSettled((prev) => !prev)}
              >
                {showSettled ? '隱藏已結清' : '顯示已結清'}
              </button>
            </div>
            <p className="font-mono text-2xl tabular-nums text-destructive">
              {formatCurrency(totalDebt)}
            </p>
          </div>

          {visibleAccounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                尚無貸款紀錄，點擊「新增貸款」開始建立。
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {visibleAccounts.map((account) => {
                  const isSettled = !account.isActive;
                  return (
                    <CompactRow
                      key={account.id}
                      testId={`debt-row-mobile-${account.id}`}
                      onClick={() => navigate(`/debt/${account.id}`)}
                      className={cn(
                        'cursor-pointer',
                        isSettled ? 'bg-transparent' : 'bg-card/50',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                          <span className="truncate">{account.name}</span>
                          {account.inGracePeriod && (
                            <StatusGlyph type="review" label={DEBT_STATUS_GRACE_PERIOD_LABEL} />
                          )}
                        </span>
                        <span className="ml-auto font-mono text-sm tabular-nums">
                          {formatCurrency(account.currentBalance)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">
                          {account.typeLabel} · 截至 {account.updatedAt ? formatDate(account.updatedAt) : '—'}
                        </span>
                        <span className="font-mono tabular-nums whitespace-nowrap">
                          {formatCurrency(account.monthlyDueAmount)}/月
                        </span>
                      </div>
                    </CompactRow>
                  );
                })}
              </div>
              <Table className="hidden md:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Outstanding Balance</TableHead>
                    <TableHead className="text-right">Monthly Payment</TableHead>
                    <TableHead className="text-right">As of</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleAccounts.map((account) => {
                    const isSettled = !account.isActive;
                    return (
                      <TableRow
                        key={account.id}
                        data-testid={`debt-row-${account.id}`}
                        onClick={() => navigate(`/debt/${account.id}`)}
                        interactive
                        className="cursor-pointer"
                      >
                        <TableCell className={isSettled ? 'text-muted-foreground' : ''}>
                          <span className="flex items-center gap-2">
                            {account.name}
                            {account.inGracePeriod && (
                              <StatusGlyph type="review" label={DEBT_STATUS_GRACE_PERIOD_LABEL} />
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{account.typeLabel}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(account.currentBalance)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatCurrency(account.monthlyDueAmount)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                          {account.updatedAt ? formatDate(account.updatedAt) : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </>
          )}
        </>
      )}

      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? '新增貸款' : '編輯貸款'}</DialogTitle>
          </DialogHeader>
          <DebtAccountForm vm={formVm} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
