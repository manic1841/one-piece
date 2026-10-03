import React from 'react';

import { ArrowRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { PageHeader } from '@/ui/components/PageHeader';
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
import { Button } from '@/ui/components/ui/button';
import {
  PROJECTS_PAGE_LABELS,
  PROJECT_COLUMN_LABELS,
  PROJECT_COLUMN_WIDTHS,
  PROJECT_FILTER_ALL,
  PROJECT_FILTER_ITEMS,
  PROJECT_STATUS_LABELS,
  projectActiveCountLabel,
  projectReorderLabel,
} from '@/ui/constants/project/projectPageLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import ProjectForm from '@/ui/features/project/components/ProjectForm';
import { useProjectPage } from '@/ui/features/project/hooks/useProjectPage';
import { type ProjectRowVM } from '@/ui/features/project/viewmodels/projectPage.vm';
import { useSortableRow } from '@/ui/hooks/useSortableList';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

const SKELETON_ROWS = [0, 1, 2, 3, 4];

const netToneClass = (net: number): string => MONEY_TONE_CLASS[net >= 0 ? 'positive' : 'negative'];

const SortableProjectRow: React.FC<{
  row: ProjectRowVM;
  onNavigate: (path: string) => void;
}> = ({ row, onNavigate }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  const navigateToDetail = () => onNavigate(`/projects/${row.id}`);
  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLTableRowElement>): void => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    navigateToDetail();
  };

  return (
    <DataTableRow
      ref={setNodeRef}
      data-testid={`project-row-${row.id}`}
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
          label={projectReorderLabel(row.name)}
          testId={`project-grip-${row.id}`}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
          className={row.isActive ? '' : 'opacity-60'}
        />
      </DataTableCell>
      <DataTableCell className={row.isActive ? '' : 'text-muted-foreground'}>
        {row.name}
      </DataTableCell>
      <DataTableCell>
        <StatusGlyph
          type={row.isActive ? 'active' : 'inactive'}
          label={row.isActive ? PROJECT_STATUS_LABELS.ACTIVE : PROJECT_STATUS_LABELS.INACTIVE}
        />
      </DataTableCell>
      <DataTableCell align="number" className={MONEY_TONE_CLASS.positive}>
        {formatCurrency(row.income)}
      </DataTableCell>
      <DataTableCell align="number" className={MONEY_TONE_CLASS.negative}>
        {formatCurrency(row.expense)}
      </DataTableCell>
      <DataTableCell align="number" className={netToneClass(row.net)}>
        {formatCurrency(row.net)}
      </DataTableCell>
    </DataTableRow>
  );
};

const SortableProjectMobileRow: React.FC<{
  row: ProjectRowVM;
  onNavigate: (path: string) => void;
}> = ({ row, onNavigate }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  const navigateToDetail = () => onNavigate(`/projects/${row.id}`);
  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    navigateToDetail();
  };

  return (
    <MobileDataRow
      ref={setNodeRef}
      data-testid={`project-row-mobile-${row.id}`}
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
          label={projectReorderLabel(row.name)}
          testId={`project-grip-${row.id}`}
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
      </div>
      <MobileDataField label={PROJECT_COLUMN_LABELS.STATUS}>
        <StatusGlyph
          type={row.isActive ? 'active' : 'inactive'}
          label={row.isActive ? PROJECT_STATUS_LABELS.ACTIVE : PROJECT_STATUS_LABELS.INACTIVE}
        />
      </MobileDataField>
      <MobileDataField label={PROJECT_COLUMN_LABELS.NET_CASH_FLOW}>
        <span className={cn('font-mono text-sm tabular-nums', netToneClass(row.net))}>
          {formatCurrency(row.net)}
        </span>
      </MobileDataField>
      <MobileDataField label={PROJECT_COLUMN_LABELS.INCOME}>
        <span className={cn('font-mono text-sm tabular-nums', MONEY_TONE_CLASS.positive)}>
          {formatCurrency(row.income)}
        </span>
      </MobileDataField>
      <MobileDataField label={PROJECT_COLUMN_LABELS.EXPENSE}>
        <span className={cn('font-mono text-sm tabular-nums', MONEY_TONE_CLASS.negative)}>
          {formatCurrency(row.expense)}
        </span>
      </MobileDataField>
    </MobileDataRow>
  );
};

const Projects: React.FC = () => {
  const { userProfile } = useAuthState();
  const navigate = useNavigate();

  const {
    loading,
    error,
    rows,
    activeCount,
    reload,
    create,
    isFormOpen,
    openForm,
    closeForm,
    showInactive,
    setShowInactive,
    reorderRows,
  } = useProjectPage(userProfile?.householdId);

  const visibleRows = showInactive ? rows : rows.filter((row) => row.isActive);
  const filterValue = showInactive ? PROJECT_FILTER_ALL : 'active';
  const handleFilterChange = (id: string) => setShowInactive(id === PROJECT_FILTER_ALL);
  const isFiltered = showInactive === false && rows.length > 0;

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{PROJECTS_PAGE_LABELS.LOADING_LABEL}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="warning">
          <AlertDescription>{PROJECTS_PAGE_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {PROJECTS_PAGE_LABELS.RETRY_ACTION}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </Alert>
      );
    }

    if (visibleRows.length === 0) {
      return (
        <EmptyState
          title={
            isFiltered ? PROJECTS_PAGE_LABELS.FILTER_EMPTY_TITLE : PROJECTS_PAGE_LABELS.EMPTY_TITLE
          }
          description={
            isFiltered
              ? PROJECTS_PAGE_LABELS.FILTER_EMPTY_DESCRIPTION
              : PROJECTS_PAGE_LABELS.EMPTY_DESCRIPTION
          }
          action={
            <Button onClick={openForm} className="gap-2">
              <Plus size={16} />
              {PROJECTS_PAGE_LABELS.CREATE_ACTION}
            </Button>
          }
        />
      );
    }

    return (
      <>
        {/* DndContext renders aria-live divs, so it must wrap the table
            rather than sit inside tbody (invalid HTML). */}
        <SortableListScope items={visibleRows} onReorder={reorderRows}>
          <DataTableScrollArea>
            <DataTable>
              <DataTableColGroup widths={PROJECT_COLUMN_WIDTHS} />
              <TableHeader>
                <DataTableHeadRow>
                  <DataTableHeadCell className="w-10">
                    <span className="sr-only">{PROJECT_COLUMN_LABELS.REORDER}</span>
                  </DataTableHeadCell>
                  <DataTableHeadCell>{PROJECT_COLUMN_LABELS.NAME}</DataTableHeadCell>
                  <DataTableHeadCell>{PROJECT_COLUMN_LABELS.STATUS}</DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {PROJECT_COLUMN_LABELS.INCOME}
                  </DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {PROJECT_COLUMN_LABELS.EXPENSE}
                  </DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {PROJECT_COLUMN_LABELS.NET_CASH_FLOW}
                  </DataTableHeadCell>
                </DataTableHeadRow>
              </TableHeader>
              <TableBody>
                {visibleRows.map((row) => (
                  <SortableProjectRow key={row.id} row={row} onNavigate={navigate} />
                ))}
              </TableBody>
            </DataTable>
          </DataTableScrollArea>
        </SortableListScope>

        <SortableListScope items={visibleRows} onReorder={reorderRows}>
          <MobileDataList>
            {visibleRows.map((row) => (
              <SortableProjectMobileRow key={row.id} row={row} onNavigate={navigate} />
            ))}
          </MobileDataList>
        </SortableListScope>
      </>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={PROJECTS_PAGE_LABELS.TITLE}
        description={PROJECTS_PAGE_LABELS.DESCRIPTION}
        actions={
          <Button onClick={openForm} className="gap-2">
            <Plus size={16} />
            {PROJECTS_PAGE_LABELS.CREATE_ACTION}
          </Button>
        }
      />

      <Toolbar
        actions={
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {projectActiveCountLabel(activeCount)}
          </span>
        }
      >
        <FilterStrip
          items={PROJECT_FILTER_ITEMS}
          value={filterValue}
          onValueChange={handleFilterChange}
          ariaLabel={PROJECTS_PAGE_LABELS.FILTER_LABEL}
        />
      </Toolbar>

      {renderContent()}

      <ProjectForm isOpen={isFormOpen} onClose={closeForm} onSubmit={create} />
    </div>
  );
};

export default Projects;
