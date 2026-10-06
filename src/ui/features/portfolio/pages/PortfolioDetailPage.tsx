import React from 'react';

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  PORTFOLIO_DETAIL_LABELS,
  PORTFOLIO_LIFECYCLE_LABELS,
} from '@/ui/constants/portfolio/labels';
import PortfolioDetail from '@/ui/features/portfolio/components/PortfolioDetail';
import { usePortfolioDetailPage } from '@/ui/features/portfolio/hooks/usePortfolioDetailPage';

const SKELETON_ROWS = [0, 1, 2, 3];

const PortfolioDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    vm,
    loading,
    error,
    reload,
    handleRename,
    handleActivate,
    handleDeactivate,
    handleDelete,
  } = usePortfolioDetailPage();

  if (loading) {
    return (
      <div role="status" className="space-y-6 pb-20">
        <span className="sr-only">{PORTFOLIO_DETAIL_LABELS.LOADING_LABEL}</span>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-16" />
        ))}
      </div>
    );
  }

  if (error !== null && !vm) {
    return (
      <div className="space-y-6 pb-20">
        <Button variant="ghost" size="sm" onClick={() => navigate('/portfolios')} className="gap-2">
          <ArrowLeft size={16} aria-hidden="true" />
          {PORTFOLIO_DETAIL_LABELS.BACK_ACTION}
        </Button>
        <Alert variant="warning">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={reload}>
            {PORTFOLIO_DETAIL_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      </div>
    );
  }

  if (!vm) {
    return (
      <EmptyState
        title={PORTFOLIO_DETAIL_LABELS.NOT_FOUND_TITLE}
        description={PORTFOLIO_DETAIL_LABELS.NOT_FOUND_DESCRIPTION}
        action={
          <Button variant="outline" onClick={() => navigate('/portfolios')}>
            {PORTFOLIO_DETAIL_LABELS.BACK_ACTION}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={<InlineEditableTitle value={vm.name} onSave={handleRename} />}
        description={PORTFOLIO_DETAIL_LABELS.DESCRIPTION}
        crumb={PORTFOLIO_DETAIL_LABELS.CRUMB}
        onBack={() => navigate('/portfolios')}
        badge={
          !vm.isActive ? (
            <StatusGlyph type="inactive" label={PORTFOLIO_LIFECYCLE_LABELS.INACTIVE} />
          ) : undefined
        }
        actions={
          vm.isActive ? (
            <Button variant="destructive" onClick={() => void handleDeactivate()}>
              {PORTFOLIO_LIFECYCLE_LABELS.DEACTIVATE}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void handleActivate()}>
              {PORTFOLIO_LIFECYCLE_LABELS.ACTIVATE}
            </Button>
          )
        }
      />

      {error !== null && (
        <Alert variant="warning">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={reload}>
            {PORTFOLIO_DETAIL_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      )}

      <PortfolioDetail vm={vm} onDelete={() => void handleDelete()} />
    </div>
  );
};

export default PortfolioDetailPage;
