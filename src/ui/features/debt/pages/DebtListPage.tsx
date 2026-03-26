import { useState } from 'react';

import { Calendar } from 'lucide-react';

import { type DebtAccount } from '@/domains/debt/schemas';
import { type Transaction } from '@/domains/ledger/schemas';
import { useAuth } from '@/infra/contexts/useAuth';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardHeader } from '@/ui/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import { Progress } from '@/ui/components/ui/progress';
import { DebtAccountForm } from '@/ui/features/debt/components/DebtAccountForm';
import { DebtPaymentHistory } from '@/ui/features/debt/components/DebtPaymentHistory';
import { DebtSettlement } from '@/ui/features/debt/components/DebtSettlement';
import { useDebtAccountCmds } from '@/ui/features/debt/hooks/useDebtAccountCmds';
import { useDebtPage } from '@/ui/features/debt/hooks/useDebtPage';
import { type DebtAccountDisplayVM } from '@/ui/features/debt/viewmodels/debtDisplay.vm';
import { useDebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';

function formatCurrency(n: number) {
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

function formatYearMonth(date: Date | null): string {
  if (!date) return '—';
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

/** Page-level summary cards */
function SummaryCards({
  totalDebt,
  totalMonthlyPayment,
}: {
  totalDebt: number;
  totalMonthlyPayment: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <p className="text-sm text-muted-foreground">總負債金額</p>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-destructive">${formatCurrency(totalDebt)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <p className="text-sm text-muted-foreground">每月固定還款</p>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">${formatCurrency(totalMonthlyPayment)}</p>
        </CardContent>
      </Card>
    </div>
  );
}

const TYPE_BADGE_CLASS: Record<string, string> = {
  mortgage: 'bg-blue-100 text-blue-700',
  car_loan: 'bg-green-100 text-green-700',
  personal_loan: 'bg-purple-100 text-purple-700',
};

/** Individual loan card */
function DebtCard({
  account,
  onEdit,
  onRemove,
  removing,
  getHistory,
}: {
  account: DebtAccountDisplayVM;
  onEdit: () => void;
  onRemove: () => void;
  removing: boolean;
  getHistory: (id: string) => Promise<Transaction[]>;
}) {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-base">{account.name}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE_CLASS[account.type] ?? ''}`}
            >
              {account.typeLabel}
            </span>
            {account.inGracePeriod && (
              <Badge
                variant="destructive"
                className="text-xs font-medium bg-amber-100 text-amber-800 border-amber-200"
              >
                寬限期至 {account.graceEndYearMonthText}
              </Badge>
            )}
            {account.projectName && (
              <Badge variant="outline" className="text-xs">
                {account.projectName}
              </Badge>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={onEdit} title="編輯">
              ✏️
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={removing}
              title="停用/刪除"
              className="text-destructive hover:text-destructive"
            >
              🗑
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>還款進度</span>
            <span>{account.repaidPercent}% 已還</span>
          </div>
          <Progress value={account.repaidPercent} className="h-2" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">剩餘本金</p>
            <p className="font-medium">${formatCurrency(account.currentBalance)}</p>
            <p className="text-xs text-muted-foreground">
              / ${formatCurrency(account.originalAmount)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">年利率</p>
            <p className="font-medium">{account.interestRate}%</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">
              {account.inGracePeriod ? '本月應付（利息）' : '每月還款'}
            </p>
            <p className="font-medium">${formatCurrency(account.monthlyDueAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">預計還清</p>
            <p className="font-medium">{formatYearMonth(account.payoffDate)}</p>
          </div>
        </div>

        {/* Action Toggle */}
        <div className="pt-2 border-t border-slate-50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-slate-500 gap-1 hover:bg-slate-50"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? '收合還款紀錄' : '查看還款紀錄'}
            <span className="text-slate-400">{showHistory ? '▲' : '▼'}</span>
          </Button>
        </div>

        {/* History List */}
        {showHistory && <DebtPaymentHistory debtAccountId={account.id} getHistory={getHistory} />}
      </CardContent>
    </Card>
  );
}

type DialogMode = 'create' | 'edit';

export default function DebtListPage() {
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId ?? '';

  const {
    debtAccountViews,
    projects,
    totalDebt,
    totalMonthlyPayment,
    getPaymentHistory,
    loading,
    error,
    reload,
  } = useDebtPage(householdId);

  const { removeDebtAccount } = useDebtAccountCmds(householdId);

  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [editTarget, setEditTarget] = useState<DebtAccount | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);

  const openCreate = () => {
    setEditTarget(null);
    setDialogMode('create');
  };

  const openEdit = (account: DebtAccountDisplayVM) => {
    setEditTarget(account);
    setDialogMode('edit');
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

  const handleRemove = async (id: string) => {
    if (!window.confirm('確定要停用或刪除這筆貸款嗎？')) return;
    setRemovingId(id);
    const result = await removeDebtAccount(id);
    setRemovingId(null);
    if (result) reload();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">債務管理</h1>
          <p className="text-muted-foreground mt-1">追蹤所有貸款與還款進度</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setIsSettlementOpen(true)}>
            <Calendar size={16} />
            月度結算
          </Button>
          <Button onClick={openCreate}>+ 新增貸款</Button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && <p className="text-muted-foreground">載入中…</p>}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
      )}

      {!loading && (
        <>
          <SummaryCards totalDebt={totalDebt} totalMonthlyPayment={totalMonthlyPayment} />

          {debtAccountViews.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                尚無貸款紀錄，點擊「新增貸款」開始建立。
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {debtAccountViews.map((account) => (
                <DebtCard
                  key={account.id}
                  account={account}
                  onEdit={() => openEdit(account)}
                  onRemove={() => handleRemove(account.id)}
                  removing={removingId === account.id}
                  getHistory={getPaymentHistory}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create / Edit Dialog */}
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

      {/* Debt Settlement Dialog */}
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
