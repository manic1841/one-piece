import { useState } from 'react';

import { Calendar, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { type DebtAccount } from '@/domains/debt/schemas';
import { useAuth } from '@/infra/contexts/useAuth';
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
import { DebtAccountForm } from '@/ui/features/debt/components/DebtAccountForm';
import { DebtSettlement } from '@/ui/features/debt/components/DebtSettlement';
import { useDebtPage } from '@/ui/features/debt/hooks/useDebtPage';
import { useDebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';

type DialogMode = 'create' | 'edit';

export default function DebtListPage() {
  const { userProfile } = useAuth();
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
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
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
            <Button variant="outline" className="gap-2" onClick={() => setIsSettlementOpen(true)}>
              <Calendar size={16} />
              月度結算
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSettled((s) => !s)}
              title={showSettled ? '隱藏已結清帳戶' : '顯示已結清帳戶'}
            >
              {showSettled ? '隱藏已結清' : '顯示已結清'}
            </Button>
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
            <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              TOTAL OUTSTANDING
            </p>
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
            <Table>
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

      <Dialog open={isSettlementOpen} onOpenChange={setIsSettlementOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>債務月度結算</DialogTitle>
          </DialogHeader>
          <DebtSettlement
            householdId={householdId}
            userEmail={userProfile?.email || ''}
            onSuccess={() => reload()}
            onCancel={() => setIsSettlementOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
