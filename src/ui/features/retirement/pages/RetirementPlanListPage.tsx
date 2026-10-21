import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { MobileDataField } from '@/ui/components/data-table';
import { Button } from '@/ui/components/ui/button';
import { PLAN_LIST_LABELS } from '@/ui/constants/retirement/planLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { ListCell, ListPageScaffold } from '@/ui/features/retirement/components/ListPageScaffold';
import { useRetirementPlanList } from '@/ui/features/retirement/hooks/useRetirementPlanList';
import { formatDate } from '@/ui/utils';

const COLUMNS = [
  { label: PLAN_LIST_LABELS.COLUMN_NAME, width: 60, align: 'text' as const },
  { label: PLAN_LIST_LABELS.COLUMN_UPDATED_AT, width: 40, align: 'number' as const },
];

export default function RetirementPlanListPage() {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const navigate = useNavigate();
  const { plans, loading, errorMessage, reload } = useRetirementPlanList(householdId);
  const open = (id: string) => navigate(`/retirement/plans/${id}`);

  return (
    <div className="space-y-8">
      <PageHeader
        title={PLAN_LIST_LABELS.TITLE}
        description={PLAN_LIST_LABELS.DESCRIPTION}
        actions={
          <Button onClick={() => navigate('/retirement/new')} className="gap-2">
            <Plus size={18} aria-hidden="true" />
            {PLAN_LIST_LABELS.CREATE_ACTION}
          </Button>
        }
      />

      <ListPageScaffold
        loading={loading}
        error={errorMessage !== null}
        retry={() => void reload()}
        loadingLabel={PLAN_LIST_LABELS.LOADING_LABEL}
        loadError={PLAN_LIST_LABELS.LOAD_ERROR}
        retryLabel={PLAN_LIST_LABELS.RETRY_ACTION}
        emptyTitle={PLAN_LIST_LABELS.EMPTY_TITLE}
        emptyDescription={PLAN_LIST_LABELS.EMPTY_DESCRIPTION}
        emptyAction={
          <Button onClick={() => navigate('/retirement/new')} className="gap-2">
            <Plus size={16} aria-hidden="true" />
            {PLAN_LIST_LABELS.EMPTY_ACTION}
          </Button>
        }
        items={plans}
        columns={COLUMNS}
        rowTestId={(plan) => `plan-row-${plan.id}`}
        mobileRowTestId={(plan) => `plan-row-mobile-${plan.id}`}
        onOpen={(plan) => open(plan.id)}
        renderDesktopRow={(plan) => (
          <>
            <ListCell>{plan.name}</ListCell>
            <ListCell align="number">{formatDate(plan.updatedAt)}</ListCell>
          </>
        )}
        renderMobileRow={(plan) => (
          <>
            <div className="truncate text-sm font-medium">{plan.name}</div>
            <MobileDataField label={PLAN_LIST_LABELS.MOBILE_UPDATED_AT}>
              <span className="font-mono text-sm tabular-nums">{formatDate(plan.updatedAt)}</span>
            </MobileDataField>
          </>
        )}
      />
    </div>
  );
}
