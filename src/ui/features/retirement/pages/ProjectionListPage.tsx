import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { MobileDataField } from '@/ui/components/data-table';
import { Button } from '@/ui/components/ui/button';
import { PROJECTION_LIST_LABELS } from '@/ui/constants/retirement/projectionLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { ListCell, ListPageScaffold } from '@/ui/features/retirement/components/ListPageScaffold';
import { useProjectionList } from '@/ui/features/retirement/hooks/useProjectionList';
import { type ProjectionListRowVM } from '@/ui/features/retirement/viewmodels/projectionList.vm';

const COLUMNS = [
  { label: PROJECTION_LIST_LABELS.COLUMN_NAME, width: 36, align: 'text' as const },
  { label: PROJECTION_LIST_LABELS.COLUMN_CREATED_AT, width: 16, align: 'text' as const },
  {
    label: PROJECTION_LIST_LABELS.COLUMN_RETIREMENT_NET_WORTH,
    width: 26,
    align: 'number' as const,
  },
  { label: PROJECTION_LIST_LABELS.COLUMN_FINAL_NET_WORTH, width: 22, align: 'number' as const },
];

function NameCell({ row }: { row: ProjectionListRowVM }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium">{row.name}</span>
      {row.isBankrupt && <StatusGlyph type="error" label={PROJECTION_LIST_LABELS.BANKRUPT} />}
      {row.isStale && <StatusGlyph type="review" label={PROJECTION_LIST_LABELS.STALE} />}
    </span>
  );
}

export default function ProjectionListPage() {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const navigate = useNavigate();
  const { rows, loading, error, reload } = useProjectionList(householdId);
  const open = (id: string) => navigate(`/retirement/projections/${id}`);
  const start = () => navigate('/retirement/new');

  return (
    <div className="space-y-8">
      <PageHeader
        title={PROJECTION_LIST_LABELS.TITLE}
        description={PROJECTION_LIST_LABELS.DESCRIPTION}
        actions={
          <Button onClick={start} className="gap-2">
            <Plus size={16} aria-hidden="true" />
            {PROJECTION_LIST_LABELS.NEW_PROJECTION}
          </Button>
        }
      />

      <ListPageScaffold
        loading={loading}
        error={error !== null}
        retry={() => void reload()}
        loadingLabel={PROJECTION_LIST_LABELS.LOADING}
        loadError={PROJECTION_LIST_LABELS.LOAD_ERROR}
        retryLabel={PROJECTION_LIST_LABELS.RETRY}
        emptyTitle={PROJECTION_LIST_LABELS.EMPTY_TITLE}
        emptyDescription={PROJECTION_LIST_LABELS.EMPTY_DESCRIPTION}
        emptyAction={<Button onClick={start}>{PROJECTION_LIST_LABELS.EMPTY_ACTION}</Button>}
        items={rows}
        columns={COLUMNS}
        rowTestId={(row) => `projection-row-${row.id}`}
        mobileRowTestId={(row) => `projection-row-mobile-${row.id}`}
        tableTestId="projection-table"
        onOpen={(row) => open(row.id)}
        renderDesktopRow={(row) => (
          <>
            <ListCell>
              <NameCell row={row} />
            </ListCell>
            <ListCell mono>{row.createdAtText}</ListCell>
            <ListCell align="number">{row.retirementNetWorthText}</ListCell>
            <ListCell align="number">{row.finalNetWorthText}</ListCell>
          </>
        )}
        renderMobileRow={(row) => (
          <>
            <NameCell row={row} />
            <MobileDataField label={PROJECTION_LIST_LABELS.COLUMN_CREATED_AT}>
              <span className="font-mono text-sm tabular-nums">{row.createdAtText}</span>
            </MobileDataField>
            <MobileDataField label={PROJECTION_LIST_LABELS.COLUMN_RETIREMENT_NET_WORTH}>
              <span className="font-mono text-sm tabular-nums">{row.retirementNetWorthText}</span>
            </MobileDataField>
            <MobileDataField label={PROJECTION_LIST_LABELS.COLUMN_FINAL_NET_WORTH}>
              <span className="font-mono text-sm tabular-nums">{row.finalNetWorthText}</span>
            </MobileDataField>
          </>
        )}
      />
    </div>
  );
}
