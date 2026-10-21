import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
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
import { PROJECTION_LIST_LABELS } from '@/ui/constants/retirement-redesign/projectionLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useProjectionList } from '@/ui/features/retirement-redesign/hooks/useProjectionList';
import { type ProjectionListRowVM } from '@/ui/features/retirement-redesign/viewmodels/projectionListVm';

const SKELETON_ROWS = [0, 1, 2, 3, 4];
const COLUMN_WIDTHS = [36, 16, 26, 22] as const;

function NameCell({ row }: { row: ProjectionListRowVM }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium">{row.name}</span>
      {row.isBankrupt && <StatusGlyph type="error" label={PROJECTION_LIST_LABELS.BANKRUPT} />}
      {row.isStale && <StatusGlyph type="review" label={PROJECTION_LIST_LABELS.STALE} />}
    </span>
  );
}

function goToProjection(id: string) {
  return `/retirement/projections/${id}`;
}

export default function ProjectionListPage() {
  const { userProfile } = useAuthState();
  const navigate = useNavigate();
  const { rows, loading, error, reload } = useProjectionList(userProfile?.householdId);

  const open = (id: string) => navigate(goToProjection(id));

  return (
    <div className="space-y-8">
      <PageHeader
        title={PROJECTION_LIST_LABELS.TITLE}
        description={PROJECTION_LIST_LABELS.DESCRIPTION}
        actions={
          <Button onClick={() => navigate('/retirement/new')} className="gap-2">
            <Plus size={16} aria-hidden="true" />
            {PROJECTION_LIST_LABELS.NEW_PROJECTION}
          </Button>
        }
      />

      {loading && (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{PROJECTION_LIST_LABELS.LOADING}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      )}

      {!loading && error !== null && (
        <Alert variant="warning">
          <AlertDescription>{PROJECTION_LIST_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {PROJECTION_LIST_LABELS.RETRY}
          </Button>
        </Alert>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          title={PROJECTION_LIST_LABELS.EMPTY_TITLE}
          description={PROJECTION_LIST_LABELS.EMPTY_DESCRIPTION}
          action={
            <Button onClick={() => navigate('/retirement/new')}>
              {PROJECTION_LIST_LABELS.EMPTY_ACTION}
            </Button>
          }
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <DataTableScrollArea>
            <DataTable data-testid="projection-table">
              <DataTableColGroup widths={COLUMN_WIDTHS} />
              <TableHeader>
                <DataTableHeadRow>
                  <DataTableHeadCell>{PROJECTION_LIST_LABELS.COLUMN_NAME}</DataTableHeadCell>
                  <DataTableHeadCell>{PROJECTION_LIST_LABELS.COLUMN_CREATED_AT}</DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {PROJECTION_LIST_LABELS.COLUMN_RETIREMENT_NET_WORTH}
                  </DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {PROJECTION_LIST_LABELS.COLUMN_FINAL_NET_WORTH}
                  </DataTableHeadCell>
                </DataTableHeadRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <DataTableRow
                    key={row.id}
                    data-testid={`projection-row-${row.id}`}
                    interactive
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => open(row.id)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key !== 'Enter' && event.key !== ' ') return;
                      event.preventDefault();
                      open(row.id);
                    }}
                  >
                    <DataTableCell>
                      <NameCell row={row} />
                    </DataTableCell>
                    <DataTableCell className="font-mono text-muted-foreground">
                      {row.createdAtText}
                    </DataTableCell>
                    <DataTableCell align="number">{row.retirementNetWorthText}</DataTableCell>
                    <DataTableCell align="number">{row.finalNetWorthText}</DataTableCell>
                  </DataTableRow>
                ))}
              </TableBody>
            </DataTable>
          </DataTableScrollArea>

          <MobileDataList>
            {rows.map((row) => (
              <MobileDataRow
                key={row.id}
                data-testid={`projection-row-mobile-${row.id}`}
                role="button"
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => open(row.id)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  open(row.id);
                }}
              >
                <NameCell row={row} />
                <MobileDataField label={PROJECTION_LIST_LABELS.COLUMN_CREATED_AT}>
                  <span className="font-mono text-sm tabular-nums">{row.createdAtText}</span>
                </MobileDataField>
                <MobileDataField label={PROJECTION_LIST_LABELS.COLUMN_RETIREMENT_NET_WORTH}>
                  <span className="font-mono text-sm tabular-nums">
                    {row.retirementNetWorthText}
                  </span>
                </MobileDataField>
                <MobileDataField label={PROJECTION_LIST_LABELS.COLUMN_FINAL_NET_WORTH}>
                  <span className="font-mono text-sm tabular-nums">{row.finalNetWorthText}</span>
                </MobileDataField>
              </MobileDataRow>
            ))}
          </MobileDataList>
        </>
      )}
    </div>
  );
}
