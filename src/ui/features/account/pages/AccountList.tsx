import React, { useMemo } from 'react';

import { ArrowRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Toolbar } from '@/ui/components/Toolbar';
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
import { MONEY_TONE_CLASS } from '@/ui/components/moneyTone';
import { GripHandle, SortableListScope } from '@/ui/components/sortable/SortableListScope';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { AccountCategorySectionTitles } from '@/ui/constants/account/label';
import {
  ACCOUNTS_PAGE_LABELS,
  ACCOUNT_COLUMN_LABELS,
  ACCOUNT_COLUMN_WIDTHS,
  ACCOUNT_FILTER_ALL,
  ACCOUNT_FILTER_ITEMS,
  ACCOUNT_STATUS_LABELS,
  ACCOUNT_SUMMARY_LABELS,
  accountReorderLabel,
} from '@/ui/constants/account/pageLabels';
import { useAccountListController } from '@/ui/features/account/hooks/useAccountListController';
import {
  type AccountRowVM,
  groupAccountRows,
} from '@/ui/features/account/viewmodels/accountList.vm';
import { useSortableRow } from '@/ui/hooks/useSortableList';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

import AccountForm from './AccountForm';

const SKELETON_ROWS = [0, 1, 2, 3, 4];

const statusLabel = (isActive: boolean): string =>
  isActive ? ACCOUNT_STATUS_LABELS.ACTIVE : ACCOUNT_STATUS_LABELS.INACTIVE;

/** The account's own currency, marked only when it is not the base currency. */
const CurrencyMarker: React.FC<{ row: AccountRowVM }> = ({ row }) =>
  row.isForeignCurrency ? (
    <Badge variant="outline" className="font-mono text-[10px]">
      {row.currency}
    </Badge>
  ) : null;

const SortableAccountRow: React.FC<{
  row: AccountRowVM;
  onSelect: (id: string) => void;
}> = ({ row, onSelect }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  const navigateToDetail = () => onSelect(row.id);
  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>): void => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    navigateToDetail();
  };

  return (
    <DataTableRow
      ref={setNodeRef}
      data-testid={`account-row-${row.id}`}
      onClick={navigateToDetail}
      onKeyDown={handleRowKeyDown}
      tabIndex={0}
      interactive
      className={cn(
        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
        isDragging && 'opacity-50',
      )}
      style={rowStyle}
    >
      <DataTableCell className="w-10 pr-0">
        <GripHandle
          label={accountReorderLabel(row.name)}
          testId={`account-grip-${row.id}`}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
          className={row.isActive ? '' : 'opacity-60'}
        />
      </DataTableCell>
      <DataTableCell className={row.isActive ? '' : 'text-muted-foreground'}>
        <span className="inline-flex items-center gap-2">
          {row.name}
          <CurrencyMarker row={row} />
        </span>
      </DataTableCell>
      <DataTableCell>
        <StatusGlyph
          type={row.isActive ? 'active' : 'inactive'}
          label={statusLabel(row.isActive)}
        />
      </DataTableCell>
      <DataTableCell align="number" className={MONEY_TONE_CLASS.default}>
        {row.balanceText}
      </DataTableCell>
      <DataTableCell align="number" className="text-muted-foreground">
        {row.periodLabel}
      </DataTableCell>
    </DataTableRow>
  );
};

const SortableAccountMobileRow: React.FC<{
  row: AccountRowVM;
  onSelect: (id: string) => void;
}> = ({ row, onSelect }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  const navigateToDetail = () => onSelect(row.id);
  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    navigateToDetail();
  };

  return (
    <MobileDataRow
      ref={setNodeRef}
      data-testid={`account-row-mobile-${row.id}`}
      onClick={navigateToDetail}
      onKeyDown={handleRowKeyDown}
      role="button"
      tabIndex={0}
      className={cn(
        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
        isDragging && 'opacity-50',
      )}
      style={rowStyle}
    >
      <div className="flex items-center gap-2">
        <GripHandle
          label={accountReorderLabel(row.name)}
          testId={`account-grip-${row.id}`}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
          className="-ml-1"
        />
        <span
          className={cn('truncate text-sm font-medium', !row.isActive && 'text-muted-foreground')}
        >
          {row.name}
        </span>
        <CurrencyMarker row={row} />
      </div>
      <MobileDataField label={ACCOUNT_COLUMN_LABELS.STATUS}>
        <StatusGlyph
          type={row.isActive ? 'active' : 'inactive'}
          label={statusLabel(row.isActive)}
        />
      </MobileDataField>
      <MobileDataField label={ACCOUNT_COLUMN_LABELS.BALANCE}>
        <span className={cn('font-mono text-sm tabular-nums', MONEY_TONE_CLASS.default)}>
          {row.balanceText}
        </span>
      </MobileDataField>
      <MobileDataField label={ACCOUNT_COLUMN_LABELS.AS_OF}>
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {row.periodLabel}
        </span>
      </MobileDataField>
    </MobileDataRow>
  );
};

const AccountList: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    error,
    rows,
    totalBalance,
    activeCount,
    reload,
    create,
    isFormOpen,
    openForm,
    closeForm,
    showInactive,
    setShowInactive,
    reorderRows,
  } = useAccountListController();

  const visibleRows = useMemo(
    () => (showInactive ? rows : rows.filter((row) => row.isActive)),
    [rows, showInactive],
  );
  const sections = useMemo(() => groupAccountRows(visibleRows), [visibleRows]);
  const filterValue = showInactive ? ACCOUNT_FILTER_ALL : 'active';

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{ACCOUNTS_PAGE_LABELS.LOADING_LABEL}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="warning">
          <AlertDescription>{ACCOUNTS_PAGE_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {ACCOUNTS_PAGE_LABELS.RETRY_ACTION}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </Alert>
      );
    }

    if (rows.length === 0) {
      return (
        <EmptyState
          title={ACCOUNTS_PAGE_LABELS.EMPTY_TITLE}
          description={ACCOUNTS_PAGE_LABELS.EMPTY_DESCRIPTION}
          action={
            <Button onClick={openForm} className="gap-2">
              <Plus size={16} />
              {ACCOUNTS_PAGE_LABELS.CREATE_ACTION}
            </Button>
          }
        />
      );
    }

    if (sections.length === 0) {
      return (
        <EmptyState
          title={ACCOUNTS_PAGE_LABELS.FILTER_EMPTY_TITLE}
          description={ACCOUNTS_PAGE_LABELS.FILTER_EMPTY_DESCRIPTION}
        />
      );
    }

    return sections.map((section) => (
      <PageSection
        key={section.category}
        title={AccountCategorySectionTitles[section.category]}
        spacing="compact"
      >
        {/* DndContext renders aria-live divs, so it must wrap the table
            rather than sit inside tbody (invalid HTML). */}
        <SortableListScope items={section.rows} onReorder={reorderRows}>
          <DataTableScrollArea>
            <DataTable>
              <DataTableColGroup widths={ACCOUNT_COLUMN_WIDTHS} />
              <TableHeader>
                <DataTableHeadRow>
                  <DataTableHeadCell className="w-10">
                    <span className="sr-only">{ACCOUNT_COLUMN_LABELS.REORDER}</span>
                  </DataTableHeadCell>
                  <DataTableHeadCell>{ACCOUNT_COLUMN_LABELS.NAME}</DataTableHeadCell>
                  <DataTableHeadCell>{ACCOUNT_COLUMN_LABELS.STATUS}</DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {ACCOUNT_COLUMN_LABELS.BALANCE}
                  </DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {ACCOUNT_COLUMN_LABELS.AS_OF}
                  </DataTableHeadCell>
                </DataTableHeadRow>
              </TableHeader>
              <TableBody>
                {section.rows.map((row) => (
                  <SortableAccountRow
                    key={row.id}
                    row={row}
                    onSelect={(id) => navigate(`/accounts/${id}`)}
                  />
                ))}
              </TableBody>
            </DataTable>
          </DataTableScrollArea>
        </SortableListScope>

        <SortableListScope items={section.rows} onReorder={reorderRows}>
          <MobileDataList>
            {section.rows.map((row) => (
              <SortableAccountMobileRow
                key={row.id}
                row={row}
                onSelect={(id) => navigate(`/accounts/${id}`)}
              />
            ))}
          </MobileDataList>
        </SortableListScope>
      </PageSection>
    ));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={ACCOUNTS_PAGE_LABELS.TITLE}
        description={ACCOUNTS_PAGE_LABELS.DESCRIPTION}
        actions={
          <Button onClick={openForm} className="gap-2">
            <Plus size={16} />
            {ACCOUNTS_PAGE_LABELS.CREATE_ACTION}
          </Button>
        }
      />

      {/* SUMMARY is the page-level conclusion and precedes the list's own
          controls; the toolbar's hairline is the only rule between them. */}
      <PageSection
        title={ACCOUNTS_PAGE_LABELS.SUMMARY_SECTION_TITLE}
        spacing="compact"
        className="border-b-0"
      >
        <MetricGroup columns={2} lastSpansFull>
          <Metric
            testId="account-total-balance"
            label={ACCOUNT_SUMMARY_LABELS.TOTAL_BALANCE}
            value={formatCurrency(totalBalance)}
          />
          <Metric
            testId="account-active-count"
            label={ACCOUNT_SUMMARY_LABELS.ACTIVE_ACCOUNTS}
            value={String(activeCount)}
          />
        </MetricGroup>
      </PageSection>

      <Toolbar>
        <FilterStrip
          items={ACCOUNT_FILTER_ITEMS}
          value={filterValue}
          onValueChange={(id) => setShowInactive(id === ACCOUNT_FILTER_ALL)}
          ariaLabel={ACCOUNTS_PAGE_LABELS.FILTER_LABEL}
        />
      </Toolbar>

      {renderContent()}

      <AccountForm isOpen={isFormOpen} onClose={closeForm} onSubmit={create} />
    </div>
  );
};

export default AccountList;
