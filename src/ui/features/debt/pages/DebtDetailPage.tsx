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
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { DEBT_STATUS_SETTLED_LABEL } from '@/ui/constants/debtStatusLabels';
import { Button } from '@/ui/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useConfirm } from '@/ui/features/app/confirm/ConfirmDialog';
import { DebtAccountForm } from '@/ui/features/debt/components/DebtAccountForm';
import { DebtPaymentsTable, type PaymentHistoryRow } from '@/ui/features/debt/components/detail/DebtPaymentsTable';
import { DebtSnapshotTable } from '@/ui/features/debt/components/detail/DebtSnapshotTable';
import { DebtTrendChart } from '@/ui/features/debt/components/detail/DebtTrendChart';
import { buildTrendGeometry } from '@/ui/features/debt/components/detail/debtTrendGeometry';
import { useDebtAccountCmds } from '@/ui/features/debt/hooks/useDebtAccountCmds';
import { useDebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';
import { useProjects } from '@/ui/features/project/hooks/useProjects';
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuthState();
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
