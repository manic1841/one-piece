import React from 'react';

import { DataTableCell, DataTableRow, MobileDataRow } from '@/ui/components/data-table';
import { MONEY_CHANGE_TONE_CLASS } from '@/ui/components/moneyTone';
import { GripHandle } from '@/ui/components/sortable/SortableListScope';
import { portfolioReorderLabel } from '@/ui/constants/portfolio/labels';
import { type PortfolioListRowVM } from '@/ui/features/portfolio/viewmodels/portfolioDisplay.vm';
import { useSortableRow } from '@/ui/hooks/useSortableList';
import { cn } from '@/ui/utils/cn';

interface SortableRowProps {
  row: PortfolioListRowVM;
  onNavigate: (path: string) => void;
}

const interactiveClass =
  'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0';

/** 整列導覽的鍵盤等價（Enter／Space），且只在列本身觸發，避免 grip 冒泡。 */
const activateOnKey = (event: React.KeyboardEvent, onActivate: () => void): void => {
  if (event.target !== event.currentTarget) return;
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  onActivate();
};

const returnToneClass = (returnRate: number | null): string => {
  if (returnRate === null) return MONEY_CHANGE_TONE_CLASS.muted;
  return returnRate < 0 ? MONEY_CHANGE_TONE_CLASS.negative : MONEY_CHANGE_TONE_CLASS.positive;
};

export const SortableTableRow: React.FC<SortableRowProps> = ({ row, onNavigate }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  const open = () => onNavigate(`/portfolios/${row.id}`);

  return (
    <DataTableRow
      ref={setNodeRef}
      data-testid={`portfolio-row-${row.id}`}
      onClick={open}
      onKeyDown={(event) => activateOnKey(event, open)}
      interactive
      tabIndex={0}
      className={cn(interactiveClass, isDragging && 'opacity-50')}
      style={rowStyle}
    >
      <DataTableCell className="w-10 pr-0">
        <GripHandle
          label={portfolioReorderLabel(row.name)}
          testId={`portfolio-grip-${row.id}`}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
          className={row.isActive ? '' : 'opacity-60'}
        />
      </DataTableCell>
      <DataTableCell className={row.isActive ? '' : 'text-muted-foreground'}>
        {row.name}
      </DataTableCell>
      <DataTableCell className="text-muted-foreground">{row.securitiesName}</DataTableCell>
      <DataTableCell className="text-muted-foreground">{row.bankName}</DataTableCell>
      <DataTableCell align="number">{row.valueText}</DataTableCell>
      <DataTableCell align="number" className={returnToneClass(row.returnRate)}>
        {row.returnRateText}
      </DataTableCell>
    </DataTableRow>
  );
};

export const SortableMobileRow: React.FC<SortableRowProps> = ({ row, onNavigate }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  const open = () => onNavigate(`/portfolios/${row.id}`);

  return (
    <MobileDataRow
      ref={setNodeRef}
      data-testid={`portfolio-row-mobile-${row.id}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => activateOnKey(event, open)}
      className={cn(
        interactiveClass,
        isDragging ? 'opacity-50' : row.isActive ? 'bg-card/50' : 'bg-transparent',
      )}
      style={rowStyle}
    >
      <div className="flex items-center justify-between gap-2">
        <GripHandle
          label={portfolioReorderLabel(row.name)}
          testId={`portfolio-grip-${row.id}`}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
          className="-ml-1 mr-1"
        />
        <span
          className={`min-w-0 truncate text-sm font-medium ${row.isActive ? '' : 'text-muted-foreground'}`}
        >
          {row.name}
        </span>
        <span className="ml-auto font-mono text-sm tabular-nums">{row.valueText}</span>
        <span className={cn('font-mono text-sm tabular-nums', returnToneClass(row.returnRate))}>
          {row.returnRateText}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="truncate">
          {row.securitiesName} · {row.bankName}
        </span>
        {row.asOfText && <span className="ml-auto whitespace-nowrap">{row.asOfText}</span>}
      </div>
    </MobileDataRow>
  );
};
