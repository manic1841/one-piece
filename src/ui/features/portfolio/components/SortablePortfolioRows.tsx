import React from 'react';

import { TableCell, TableRow } from '@/ui/components/ui/table';
import CompactRow from '@/ui/components/CompactRow';
import { GripHandle } from '@/ui/components/sortable/SortableListScope';
import { useSortableRow } from '@/ui/components/sortable/useSortableList';
import { formatPercentage } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

export interface PortfolioRowVM {
  id: string;
  name: string;
  securitiesName: string;
  bankName: string;
  valueText: string;
  returnRate: number | null;
  asOfText: string | null;
  isActive: boolean;
}

interface SortableTableRowProps {
  row: PortfolioRowVM;
  onNavigate: (path: string) => void;
}

const SortableTableRow: React.FC<SortableTableRowProps> = ({ row, onNavigate }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  return (
    <TableRow
      ref={setNodeRef}
      onClick={() => onNavigate(`/portfolios/${row.id}`)}
      interactive
      className={cn('cursor-pointer', isDragging && 'opacity-50')}
      style={rowStyle}
      data-testid={`portfolio-row-${row.id}`}
    >
      <TableCell className="w-10 pr-0">
        <GripHandle
          label={`Reorder ${row.name}`}
          testId={`portfolio-grip-${row.id}`}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
          className={row.isActive ? '' : 'opacity-60'}
        />
      </TableCell>
      <TableCell className={row.isActive ? '' : 'text-muted-foreground'}>
        {row.name}
      </TableCell>
      <TableCell className="text-muted-foreground">{row.securitiesName}</TableCell>
      <TableCell className="text-muted-foreground">{row.bankName}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">{row.valueText}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {row.returnRate === null ? '—' : formatPercentage(row.returnRate)}
      </TableCell>
    </TableRow>
  );
};

interface SortableCompactRowProps {
  row: PortfolioRowVM;
  onNavigate: (path: string) => void;
}

const SortableCompactRow: React.FC<SortableCompactRowProps> = ({ row, onNavigate }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  return (
    <CompactRow
      ref={setNodeRef}
      testId={`portfolio-row-mobile-${row.id}`}
      onClick={() => onNavigate(`/portfolios/${row.id}`)}
      className={cn(
        'cursor-pointer',
        isDragging ? 'opacity-50' : row.isActive ? 'bg-card/50' : 'bg-transparent',
      )}
      style={rowStyle}
    >
      <div className="flex items-center justify-between gap-2">
        <GripHandle
          label={`Reorder ${row.name}`}
          testId={`portfolio-grip-${row.id}`}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
          className="-ml-1 mr-1"
        />
        <span className={`min-w-0 truncate text-sm font-medium ${row.isActive ? '' : 'text-muted-foreground'}`}>
          {row.name}
        </span>
        <span className="ml-auto font-mono text-sm tabular-nums">{row.valueText}</span>
        <span
          className={`font-mono text-sm tabular-nums ${row.returnRate !== null && row.returnRate < 0 ? 'text-negative' : 'text-positive'}`}
        >
          {row.returnRate === null ? '—' : formatPercentage(row.returnRate)}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="truncate">
          {row.securitiesName} · {row.bankName}
        </span>
        {row.asOfText && <span className="ml-auto whitespace-nowrap">{row.asOfText}</span>}
      </div>
    </CompactRow>
  );
};

export { SortableTableRow, SortableCompactRow };
