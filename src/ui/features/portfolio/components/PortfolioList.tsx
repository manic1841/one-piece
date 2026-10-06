import React from 'react';

import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import {
  DataTable,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableScrollArea,
  MobileDataList,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { SortableListScope } from '@/ui/components/sortable/SortableListScope';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  PORTFOLIO_ALLOCATION_LABELS,
  PORTFOLIO_COLUMN_LABELS,
  PORTFOLIO_COLUMN_WIDTHS,
  PORTFOLIO_PAGE_LABELS,
} from '@/ui/constants/portfolio/labels';
import { usePortfolioListController } from '@/ui/features/portfolio/hooks/usePortfolioListController';

import HoldingsAllocation from './HoldingsAllocation';
import PortfolioForm from './PortfolioForm';
import { SortableMobileRow, SortableTableRow } from './SortablePortfolioRows';

const SKELETON_ROWS = [0, 1, 2, 3, 4];

/** Portfolio list surface; all data orchestration lives in `usePortfolioListController`. */
const PortfolioList: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    error,
    reload,
    rows,
    overview,
    allocation,
    accounts,
    reorderRows,
    create,
    isFormOpen,
    openForm,
    closeForm,
  } = usePortfolioListController();

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{PORTFOLIO_PAGE_LABELS.LOADING_LABEL}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="warning">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {PORTFOLIO_PAGE_LABELS.RETRY_ACTION}
          </Button>
        </Alert>
      );
    }

    if (rows.length === 0) {
      return (
        <EmptyState
          title={PORTFOLIO_PAGE_LABELS.EMPTY_TITLE}
          description={PORTFOLIO_PAGE_LABELS.EMPTY_DESCRIPTION}
          action={
            <Button onClick={openForm} className="gap-2">
              <Plus size={16} aria-hidden="true" />
              {PORTFOLIO_PAGE_LABELS.CREATE_ACTION}
            </Button>
          }
        />
      );
    }

    return (
      <>
        <PageSection title={PORTFOLIO_PAGE_LABELS.TOTAL_VALUE_LABEL} spacing="compact">
          <FinancialNumber value={overview.totalValueText} size="large" className="mt-2" />
        </PageSection>

        <HoldingsAllocation vm={allocation} emptyText={PORTFOLIO_ALLOCATION_LABELS.EMPTY_LIST} />

        {/* DndContext renders aria-live divs, so it must wrap the table
            rather than sit inside tbody (invalid HTML). */}
        <SortableListScope items={rows} onReorder={reorderRows}>
          <DataTableScrollArea>
            <DataTable>
              <DataTableColGroup widths={PORTFOLIO_COLUMN_WIDTHS} />
              <TableHeader>
                <DataTableHeadRow>
                  <DataTableHeadCell className="w-10">
                    <span className="sr-only">{PORTFOLIO_COLUMN_LABELS.REORDER}</span>
                  </DataTableHeadCell>
                  <DataTableHeadCell>{PORTFOLIO_COLUMN_LABELS.NAME}</DataTableHeadCell>
                  <DataTableHeadCell>{PORTFOLIO_COLUMN_LABELS.SECURITIES}</DataTableHeadCell>
                  <DataTableHeadCell>{PORTFOLIO_COLUMN_LABELS.BANK}</DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {PORTFOLIO_COLUMN_LABELS.VALUE}
                  </DataTableHeadCell>
                  <DataTableHeadCell align="number">
                    {PORTFOLIO_COLUMN_LABELS.RETURN}
                  </DataTableHeadCell>
                </DataTableHeadRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <SortableTableRow key={row.id} row={row} onNavigate={navigate} />
                ))}
              </TableBody>
            </DataTable>
          </DataTableScrollArea>
        </SortableListScope>

        <SortableListScope items={rows} onReorder={reorderRows}>
          <MobileDataList>
            {rows.map((row) => (
              <SortableMobileRow key={row.id} row={row} onNavigate={navigate} />
            ))}
          </MobileDataList>
        </SortableListScope>
      </>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={PORTFOLIO_PAGE_LABELS.TITLE}
        description={PORTFOLIO_PAGE_LABELS.DESCRIPTION}
        actions={
          <Button onClick={openForm} className="gap-2">
            <Plus size={18} aria-hidden="true" />
            {PORTFOLIO_PAGE_LABELS.CREATE_ACTION}
          </Button>
        }
      />

      {renderContent()}

      <PortfolioForm
        isOpen={isFormOpen}
        onClose={closeForm}
        onSubmit={create}
        accounts={accounts}
      />
    </div>
  );
};

export default PortfolioList;
