import React from 'react';

import { ArrowLeft, ArrowRight, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { ACCOUNT_DETAIL_LABELS } from '@/ui/constants/account/detailLabels';
import { AccountCategoryLabels } from '@/ui/constants/account/label';
import AccountDetail from '@/ui/features/account/components/AccountDetail';
import { useAccountDetailPage } from '@/ui/features/account/hooks/useAccountDetailPage';
import { type AccountWithSnapshot } from '@/ui/features/account/viewmodels/account.vm';

interface AccountDetailPageProps {
  account?: AccountWithSnapshot;
}

const SKELETON_ROWS = [0, 1, 2];

const AccountDetailPage: React.FC<AccountDetailPageProps> = ({ account }) => {
  const navigate = useNavigate();
  const {
    activeAccount,
    name,
    loading,
    error,
    notFound,
    reload,
    isActive,
    trend,
    historyRows,
    latestRow,
    handleRename,
    handleToggleActive,
    handleDelete,
  } = useAccountDetailPage({ account });

  const backToList = () => navigate('/accounts');

  if (loading) {
    return (
      <div role="status" className="space-y-6 pb-20">
        <span className="sr-only">{ACCOUNT_DETAIL_LABELS.LOADING_LABEL}</span>
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
          {ACCOUNT_DETAIL_LABELS.BACK_LABEL}
        </Button>
        <Alert variant="warning">
          <AlertDescription>{ACCOUNT_DETAIL_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={reload}>
            {ACCOUNT_DETAIL_LABELS.RETRY_ACTION}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </Alert>
      </div>
    );
  }

  if (notFound || !activeAccount) {
    return (
      <EmptyState
        title={ACCOUNT_DETAIL_LABELS.NOT_FOUND_TITLE}
        description={ACCOUNT_DETAIL_LABELS.NOT_FOUND_DESCRIPTION}
        action={
          <Button variant="outline" onClick={backToList}>
            {ACCOUNT_DETAIL_LABELS.NOT_FOUND_ACTION}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={<InlineEditableTitle value={name} onSave={handleRename} />}
        crumb={`${ACCOUNT_DETAIL_LABELS.CRUMB} / ${AccountCategoryLabels[activeAccount.category].toUpperCase()}`}
        onBack={backToList}
        badge={
          !isActive ? (
            <StatusGlyph type="inactive" label={ACCOUNT_DETAIL_LABELS.INACTIVE_BADGE} />
          ) : undefined
        }
        actions={
          isActive ? (
            <Button variant="destructive" onClick={() => void handleToggleActive()}>
              <Power size={16} />
              {ACCOUNT_DETAIL_LABELS.DEACTIVATE_ACTION}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void handleToggleActive()}>
              {ACCOUNT_DETAIL_LABELS.ACTIVATE_ACTION}
            </Button>
          )
        }
      />

      {error !== null && (
        <Alert variant="warning">
          <AlertDescription>{ACCOUNT_DETAIL_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={reload}>
            {ACCOUNT_DETAIL_LABELS.RETRY_ACTION}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </Alert>
      )}

      <AccountDetail
        name={name}
        account={activeAccount}
        latestRow={latestRow}
        trend={trend}
        historyRows={historyRows}
        onDelete={() => void handleDelete()}
      />
    </div>
  );
};

export default AccountDetailPage;
