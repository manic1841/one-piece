import { CircleCheck, Copy, Plus } from 'lucide-react';
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
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { RETIREMENT_LIST_LABELS } from '@/ui/constants/retirement/retirementListLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useRetirementPlanListPage } from '@/ui/features/retirement/hooks/useRetirementPlanListPage';
import { type RetirementPlanListItemVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import { cn } from '@/ui/utils/cn';

const COLUMN_WIDTHS = [30, 18, 26, 16, 10] as const;

const SKELETON_ROWS = [0, 1, 2, 3, 4];

const ACTIVE_ROW_CLASS = 'border-l-2 border-l-primary';

/** active 計畫的狀態徽章：以文字標示，primary 色僅輔助（不可只靠顏色）。 */
const PlanStatusBadge: React.FC<{ plan: RetirementPlanListItemVM }> = ({ plan }) => (
  <Badge
    variant="outline"
    className={plan.isActive ? 'border-primary/40 text-primary' : 'text-muted-foreground'}
  >
    {plan.statusText}
  </Badge>
);

export default function RetirementPlanList() {
  const { userProfile } = useAuthState();
  const navigate = useNavigate();
  const { planItems, loading, error, mutating, createPlan, duplicatePlan, setActivePlan, reload } =
    useRetirementPlanListPage(userProfile?.householdId, userProfile?.email);

  const go = (id: string) => navigate(`/retirement/${id}`);

  return (
    <div className="space-y-8">
      <PageHeader
        title={RETIREMENT_LIST_LABELS.TITLE}
        description={RETIREMENT_LIST_LABELS.DESCRIPTION}
        actions={
          <Button onClick={createPlan} disabled={mutating}>
            <Plus className="mr-2 h-4 w-4" />
            {RETIREMENT_LIST_LABELS.NEW_PLAN_ACTION}
          </Button>
        }
      />

      {loading && (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{RETIREMENT_LIST_LABELS.LOADING}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      )}

      {!!error && (
        <Alert variant="warning">
          <AlertDescription>{RETIREMENT_LIST_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {RETIREMENT_LIST_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      )}

      {!loading && !error && planItems.length === 0 && (
        <EmptyState
          title={RETIREMENT_LIST_LABELS.EMPTY_TITLE}
          description={RETIREMENT_LIST_LABELS.EMPTY_DESCRIPTION}
          action={
            <Button onClick={createPlan} disabled={mutating}>
              {RETIREMENT_LIST_LABELS.EMPTY_ACTION}
            </Button>
          }
        />
      )}

      {!loading && !error && planItems.length > 0 && (
        <>
          {/* Desktop table first, mobile list second: keeps DOM order aligned with
              AccountList so `getAllByTestId(...)[0]` resolves to the desktop node. */}
          <DataTableScrollArea>
            <DataTable data-testid="retirement-plan-table">
              <DataTableColGroup widths={COLUMN_WIDTHS} />
              <TableHeader>
                <DataTableHeadRow>
                  <DataTableHeadCell>{RETIREMENT_LIST_LABELS.COLUMN_NAME}</DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {RETIREMENT_LIST_LABELS.COLUMN_RETIREMENT_AGE}
                  </DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {RETIREMENT_LIST_LABELS.COLUMN_FINAL_NET_WORTH}
                  </DataTableHeadCell>
                  <DataTableHeadCell>{RETIREMENT_LIST_LABELS.COLUMN_STATUS}</DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    <span className="sr-only">{RETIREMENT_LIST_LABELS.DUPLICATE_ACTION}</span>
                  </DataTableHeadCell>
                </DataTableHeadRow>
              </TableHeader>
              <TableBody>
                {planItems.map((plan) => (
                  <DataTableRow
                    key={plan.id}
                    data-testid={`retirement-plan-row-${plan.id}`}
                    onClick={() => go(plan.id)}
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      go(plan.id);
                    }}
                    interactive
                    className={cn(
                      'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      plan.isActive && ACTIVE_ROW_CLASS,
                    )}
                  >
                    <DataTableCell className="font-medium">{plan.name}</DataTableCell>
                    <DataTableCell align="number" className="text-muted-foreground">
                      {plan.retirementAge}
                    </DataTableCell>
                    <DataTableCell align="number">{plan.finalNetWorthText}</DataTableCell>
                    <DataTableCell>
                      <PlanStatusBadge plan={plan} />
                    </DataTableCell>
                    <DataTableCell align="number">
                      <div className="flex items-center justify-end gap-1">
                        {!plan.isActive && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={RETIREMENT_LIST_LABELS.ACTIVATE_ACTION}
                            onClick={(event) => {
                              event.stopPropagation();
                              void setActivePlan(plan.id);
                            }}
                            disabled={mutating}
                          >
                            <CircleCheck className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={RETIREMENT_LIST_LABELS.DUPLICATE_ACTION}
                          onClick={(event) => {
                            event.stopPropagation();
                            void duplicatePlan(plan.id);
                          }}
                          disabled={mutating}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </TableBody>
            </DataTable>
          </DataTableScrollArea>

          <MobileDataList>
            {planItems.map((plan) => (
              <MobileDataRow
                key={plan.id}
                data-testid={`retirement-plan-row-mobile-${plan.id}`}
                role="button"
                tabIndex={0}
                onClick={() => go(plan.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  go(plan.id);
                }}
                className={cn(
                  'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  plan.isActive && ACTIVE_ROW_CLASS,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{plan.name}</span>
                  <PlanStatusBadge plan={plan} />
                </div>
                <MobileDataField label={RETIREMENT_LIST_LABELS.COLUMN_RETIREMENT_AGE}>
                  <span className="font-mono text-sm tabular-nums">{plan.retirementAge}</span>
                </MobileDataField>
                <MobileDataField label={RETIREMENT_LIST_LABELS.COLUMN_FINAL_NET_WORTH}>
                  <span className="font-mono text-sm tabular-nums">{plan.finalNetWorthText}</span>
                </MobileDataField>
              </MobileDataRow>
            ))}
          </MobileDataList>
        </>
      )}
    </div>
  );
}
