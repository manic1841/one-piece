import React, { useMemo, useState } from 'react';

import { ArrowRight, Pencil } from 'lucide-react';

import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { RowActions } from '@/ui/components/RowActions';
import { Skeleton } from '@/ui/components/Skeleton';
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
  MobileExpandableRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  RetirementBaselineLabels as L,
  RETIREMENT_BASELINE_COLUMN_WIDTHS,
  type RetirementBaselineFilter,
  RetirementBaselineFilterItems,
  RetirementTabContentLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementBaselineItem,
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  filterRetirementBaselineItems,
} from '@/ui/features/retirement/viewmodels/retirementBaseline.vm';

import { ExpenseEntryEditor } from '../ExpenseEntryEditor';
import { IncomeEntryEditor } from '../IncomeEntryEditor';

interface FinancialBaselineProps {
  currentYear: number;
  birthYear: number;
  retirementAge: number;
  planInflationRate: number;
  items: RetirementBaselineItem[];
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onImportFromLedger: () => void;
  onImportDebtRepayments: () => void;
  onUpdateIncome: (id: string, data: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  onUpdateExpense: (id: string, data: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  onDeleteIncome: (id: string) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

const SKELETON_ROWS = [0, 1, 2, 3];

/**
 * Financial Baseline（spec #301 §4）：合併原 Income 與 Living Expenses 的單一
 * ledger 來源管理視圖。列只能由 Import 產生，因此沒有手動新增；沒有匯入來源的舊列
 * 保留但唯讀。手動新增既已移除，空白狀態即為首次使用的主要入口，CTA 指向
 * Import from Ledger。
 */
export const FinancialBaseline: React.FC<FinancialBaselineProps> = ({
  currentYear,
  birthYear,
  retirementAge,
  planInflationRate,
  items,
  loading,
  error,
  onRetry,
  onImportFromLedger,
  onImportDebtRepayments,
  onUpdateIncome,
  onUpdateExpense,
  onDeleteIncome,
  onDeleteExpense,
}) => {
  const [filter, setFilter] = useState<RetirementBaselineFilter>('all');
  const visibleItems = useMemo(() => filterRetirementBaselineItems(items, filter), [items, filter]);

  const renderEditor = (item: RetirementBaselineItem) => {
    const trigger = (
      <Button variant="ghost" size="icon" aria-label={RetirementTabContentLabels.editAction}>
        <Pencil className="h-4 w-4" />
      </Button>
    );
    const editorAnchor = {
      currentYear,
      birthYear,
      retirementAge,
      planInflationRate,
      trigger,
    };

    return item.kind === 'income' ? (
      <IncomeEntryEditor
        {...editorAnchor}
        initialData={item.domain}
        onSave={(data) => onUpdateIncome(item.vm.id, data)}
      />
    ) : (
      <ExpenseEntryEditor
        {...editorAnchor}
        initialData={item.domain}
        onSave={(data) => onUpdateExpense(item.vm.id, data)}
      />
    );
  };

  const renderActions = (item: RetirementBaselineItem) => (
    <RowActions
      // A row with no import source is read-only: it keeps delete (for cleanup)
      // but offers no edit.
      edit={item.vm.isReadOnly ? undefined : renderEditor(item)}
      onDelete={() =>
        void (item.kind === 'income' ? onDeleteIncome(item.vm.id) : onDeleteExpense(item.vm.id))
      }
      deleteLabel={RetirementTabContentLabels.deleteAction}
    />
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">{L.loading}</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="warning">
          <AlertDescription>{L.loadError}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={onRetry}>
            {L.retryAction}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </Alert>
      );
    }

    return (
      <>
        <Toolbar
          actions={
            <>
              <Button variant="outline" size="sm" onClick={onImportFromLedger}>
                {RetirementTabContentLabels.importFromLedger}
              </Button>
              <Button variant="outline" size="sm" onClick={onImportDebtRepayments}>
                {RetirementTabContentLabels.importDebtRepayments}
              </Button>
            </>
          }
        >
          <FilterStrip
            items={RetirementBaselineFilterItems}
            value={filter}
            onValueChange={(id) => setFilter(id as RetirementBaselineFilter)}
            ariaLabel={L.filterAriaLabel}
          />
        </Toolbar>

        {items.length === 0 ? (
          <EmptyState
            title={L.emptyTitle}
            description={L.emptyDescription}
            action={
              <Button onClick={onImportFromLedger}>
                {RetirementTabContentLabels.importFromLedger}
              </Button>
            }
          />
        ) : visibleItems.length === 0 ? (
          <EmptyState title={L.filterEmptyTitle} description={L.filterEmptyDescription} />
        ) : (
          <>
            <DataTableScrollArea>
              <DataTable>
                <DataTableColGroup widths={RETIREMENT_BASELINE_COLUMN_WIDTHS} />
                <TableHeader>
                  <DataTableHeadRow>
                    <DataTableHeadCell>{L.columnName}</DataTableHeadCell>
                    <DataTableHeadCell>{L.columnSource}</DataTableHeadCell>
                    <DataTableHeadCell align="number">{L.columnBaseAmount}</DataTableHeadCell>
                    <DataTableHeadCell align="number">{L.columnGrowth}</DataTableHeadCell>
                    <DataTableHeadCell>{L.columnEndCondition}</DataTableHeadCell>
                    <DataTableHeadCell align="number">{L.columnActions}</DataTableHeadCell>
                  </DataTableHeadRow>
                </TableHeader>
                <TableBody>
                  {visibleItems.map((item) => (
                    <DataTableRow key={item.vm.id} data-testid={`baseline-row-${item.vm.id}`}>
                      <DataTableCell>{item.vm.name}</DataTableCell>
                      <DataTableCell className="font-mono text-xs text-muted-foreground">
                        {item.vm.sourceText}
                      </DataTableCell>
                      <DataTableCell align="number">{item.vm.baseAmountText}</DataTableCell>
                      <DataTableCell align="number" className="text-muted-foreground">
                        {item.vm.growthText}
                      </DataTableCell>
                      <DataTableCell>{item.vm.endConditionText}</DataTableCell>
                      <DataTableCell align="number">{renderActions(item)}</DataTableCell>
                    </DataTableRow>
                  ))}
                </TableBody>
              </DataTable>
            </DataTableScrollArea>

            <MobileDataList>
              {visibleItems.map((item) => (
                <MobileExpandableRow
                  key={item.vm.id}
                  data-testid={`baseline-row-mobile-${item.vm.id}`}
                  summary={<span className="truncate text-sm font-medium">{item.vm.name}</span>}
                  value={
                    <span className="font-mono text-sm tabular-nums">{item.vm.baseAmountText}</span>
                  }
                  meta={
                    <span className="truncate">
                      {item.vm.sourceText} · {item.vm.growthText}
                    </span>
                  }
                  actions={renderActions(item)}
                  details={
                    <MobileDataField label={L.columnEndCondition}>
                      {item.vm.endConditionText}
                    </MobileDataField>
                  }
                />
              ))}
            </MobileDataList>
          </>
        )}
      </>
    );
  };

  return <div className="space-y-4">{renderContent()}</div>;
};
