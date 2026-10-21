import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataField,
  MobileDataList,
  MobileDataRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { PLAN_LIST_LABELS } from '@/ui/constants/retirement-redesign/planLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useRetirementPlanList } from '@/ui/features/retirement-redesign/hooks/useRetirementPlanList';
import { formatDate } from '@/ui/utils';

const SKELETON_ROWS = [0, 1, 2, 3, 4];
const COLUMN_WIDTHS = [60, 40] as const;

export default function RetirementPlanListPage() {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const navigate = useNavigate();
  const { plans, loading, errorMessage, reload } = useRetirementPlanList(householdId);

  const openNewPlan = () => navigate('/retirement/new');

  return (
    <div className="space-y-8">
      <PageHeader
        title={PLAN_LIST_LABELS.TITLE}
        description={PLAN_LIST_LABELS.DESCRIPTION}
        actions={
          <Button onClick={openNewPlan} className="gap-2">
            <Plus size={18} aria-hidden="true" />
            {PLAN_LIST_LABELS.CREATE_ACTION}
          </Button>
        }
      />

      {loading && (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{PLAN_LIST_LABELS.LOADING_LABEL}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      )}

      {!loading && errorMessage !== null && (
        <Alert variant="warning">
          <AlertDescription>{PLAN_LIST_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {PLAN_LIST_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      )}

      {!loading && errorMessage === null && plans.length === 0 && (
        <EmptyState
          title={PLAN_LIST_LABELS.EMPTY_TITLE}
          description={PLAN_LIST_LABELS.EMPTY_DESCRIPTION}
          action={
            <Button onClick={openNewPlan} className="gap-2">
              <Plus size={16} aria-hidden="true" />
              {PLAN_LIST_LABELS.EMPTY_ACTION}
            </Button>
          }
        />
      )}

      {!loading && errorMessage === null && plans.length > 0 && (
        <>
          <MobileDataList>
            {plans.map((plan) => (
              <MobileDataRow
                key={plan.id}
                data-testid={`plan-row-mobile-${plan.id}`}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/retirement/plans/${plan.id}`)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  navigate(`/retirement/plans/${plan.id}`);
                }}
                className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
              >
                <div className="truncate text-sm font-medium">{plan.name}</div>
                <MobileDataField label={PLAN_LIST_LABELS.MOBILE_UPDATED_AT}>
                  <span className="font-mono text-sm tabular-nums">
                    {formatDate(plan.updatedAt)}
                  </span>
                </MobileDataField>
              </MobileDataRow>
            ))}
          </MobileDataList>

          <DataTableScrollArea>
            <DataTable>
              <DataTableColGroup widths={COLUMN_WIDTHS} />
              <TableHeader>
                <DataTableHeadRow>
                  <DataTableHeadCell>{PLAN_LIST_LABELS.COLUMN_NAME}</DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {PLAN_LIST_LABELS.COLUMN_UPDATED_AT}
                  </DataTableHeadCell>
                </DataTableHeadRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <DataTableRow
                    key={plan.id}
                    data-testid={`plan-row-${plan.id}`}
                    onClick={() => navigate(`/retirement/plans/${plan.id}`)}
                    interactive
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      navigate(`/retirement/plans/${plan.id}`);
                    }}
                    className="cursor-pointer"
                  >
                    <DataTableCell>{plan.name}</DataTableCell>
                    <DataTableCell align="number" className="text-muted-foreground">
                      {formatDate(plan.updatedAt)}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </TableBody>
            </DataTable>
          </DataTableScrollArea>
        </>
      )}
    </div>
  );
}
