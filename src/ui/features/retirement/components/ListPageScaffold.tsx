import { type ReactNode } from 'react';

import { EmptyState } from '@/ui/components/EmptyState';
import { Skeleton } from '@/ui/components/Skeleton';
import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataList,
  MobileDataRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';

const SKELETON_ROWS = [0, 1, 2, 3, 4];

export interface ListColumn {
  label: string;
  width: number;
  align?: 'text' | 'number';
}

interface ListPageScaffoldProps<T> {
  loading: boolean;
  error: boolean;
  retry: () => void;
  loadingLabel: string;
  loadError: string;
  retryLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction: ReactNode;
  items: T[];
  columns: ListColumn[];
  rowTestId: (item: T) => string;
  mobileRowTestId: (item: T) => string;
  tableTestId?: string;
  onOpen: (item: T) => void;
  renderDesktopRow: (item: T) => ReactNode;
  renderMobileRow: (item: T) => ReactNode;
}

/** Shared loading / error / empty / table / mobile scaffold for list pages. */
export function ListPageScaffold<T>({
  loading,
  error,
  retry,
  loadingLabel,
  loadError,
  retryLabel,
  emptyTitle,
  emptyDescription,
  emptyAction,
  items,
  columns,
  rowTestId,
  mobileRowTestId,
  tableTestId,
  onOpen,
  renderDesktopRow,
  renderMobileRow,
}: ListPageScaffoldProps<T>) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>, item: T) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onOpen(item);
  };

  if (loading) {
    return (
      <div role="status" className="space-y-2 py-2">
        <span className="sr-only">{loadingLabel}</span>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-12" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="warning">
        <AlertDescription>{loadError}</AlertDescription>
        <Button variant="text" className="ml-auto shrink-0" onClick={retry}>
          {retryLabel}
        </Button>
      </Alert>
    );
  }

  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  }

  return (
    <>
      <MobileDataList>
        {items.map((item) => (
          <MobileDataRow
            key={rowTestId(item)}
            data-testid={mobileRowTestId(item)}
            role="button"
            tabIndex={0}
            className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
            onClick={() => onOpen(item)}
            onKeyDown={(event) => onKeyDown(event, item)}
          >
            {renderMobileRow(item)}
          </MobileDataRow>
        ))}
      </MobileDataList>

      <DataTableScrollArea>
        <DataTable data-testid={tableTestId}>
          <DataTableColGroup widths={columns.map((column) => column.width)} />
          <TableHeader>
            <DataTableHeadRow>
              {columns.map((column) => (
                <DataTableHeadCell key={column.label} align={column.align}>
                  {column.label}
                </DataTableHeadCell>
              ))}
            </DataTableHeadRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <DataTableRow
                key={rowTestId(item)}
                data-testid={rowTestId(item)}
                interactive
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => onOpen(item)}
                onKeyDown={(event) => onKeyDown(event, item)}
              >
                {renderDesktopRow(item)}
              </DataTableRow>
            ))}
          </TableBody>
        </DataTable>
      </DataTableScrollArea>
    </>
  );
}

export function ListCell({
  align,
  children,
  mono,
}: {
  align?: 'text' | 'number';
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <DataTableCell align={align} className={mono ? 'font-mono text-muted-foreground' : undefined}>
      {children}
    </DataTableCell>
  );
}
