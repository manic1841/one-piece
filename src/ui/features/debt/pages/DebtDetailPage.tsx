import { ArrowLeft, Pencil, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { DEBT_DETAIL_LABELS, debtInterestRateLabel } from '@/ui/constants/debt/detailLabels';
import { DEBT_STATUS_INACTIVE_LABEL, DEBT_STATUS_SETTLED_LABEL } from '@/ui/constants/debt/label';
import { DebtAccountFormDialog } from '@/ui/features/debt/components/DebtAccountFormDialog';
import DebtDetail from '@/ui/features/debt/components/DebtDetail';
import { useDebtDetailPage } from '@/ui/features/debt/hooks/useDebtDetailPage';
import { type DebtAccount } from '@/ui/features/debt/viewmodels/debtDisplay.vm';

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
    error,
    notFound,
    reload,
    isEditOpen,
    setIsEditOpen,
    formVm,
    handleDisable,
    handleDelete,
    handleEnable,
  } = useDebtDetailPage({ account });

  const backToList = () => navigate('/debt');

  if (loading) {
    return (
      <div role="status" className="space-y-6 pb-20">
        <span className="sr-only">{DEBT_DETAIL_LABELS.LOADING_LABEL}</span>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-16" />
        ))}
      </div>
    );
  }

  if (error !== null && !activeAccount) {
    return (
      <div className="space-y-6 pb-20">
        <Button variant="ghost" size="sm" onClick={backToList} className="gap-2">
          <ArrowLeft size={16} aria-hidden="true" />
          {DEBT_DETAIL_LABELS.BACK_LABEL}
        </Button>
        <Alert variant="warning">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={reload}>
            {DEBT_DETAIL_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      </div>
    );
  }

  if (notFound || !activeAccount) {
    return (
      <EmptyState
        title={DEBT_DETAIL_LABELS.NOT_FOUND_TITLE}
        description={DEBT_DETAIL_LABELS.NOT_FOUND_DESCRIPTION}
        action={
          <Button variant="outline" onClick={backToList}>
            {DEBT_DETAIL_LABELS.NOT_FOUND_ACTION}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={activeAccount.name}
        description={debtInterestRateLabel(activeAccount.interestRate)}
        crumb={DEBT_DETAIL_LABELS.CRUMB}
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
                {DEBT_DETAIL_LABELS.ACTIVATE_ACTION}
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setIsEditOpen(true)}>
                <Pencil size={16} aria-hidden="true" />
                {DEBT_DETAIL_LABELS.EDIT_ACTION}
              </Button>
            )}
            {activeAccount.isActive && (
              <Button variant="destructive" onClick={() => void handleDisable()}>
                <Power size={16} aria-hidden="true" />
                {DEBT_DETAIL_LABELS.DEACTIVATE_ACTION}
              </Button>
            )}
          </div>
        }
      />

      {error !== null && (
        <Alert variant="warning">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={reload}>
            {DEBT_DETAIL_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      )}

      <DebtDetail
        account={activeAccount}
        trend={trend}
        historyMonths={historyMonths}
        onDelete={() => void handleDelete()}
      />

      <DebtAccountFormDialog
        open={isEditOpen}
        onOpenChange={(open) => !open && setIsEditOpen(false)}
        title={DEBT_DETAIL_LABELS.EDIT_ACTION}
        vm={formVm}
      />
    </div>
  );
}
