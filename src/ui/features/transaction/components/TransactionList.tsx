import React from 'react';

import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Input } from '@/ui/components/ui/input';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/ui/components/ui/table';
import { type TransactionListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';

import { TransactionItem } from './TransactionItem';

interface TransactionListProps {
  items: TransactionListItemVM[];
  loading: boolean;
  onEdit?: (transaction: TransactionListItemVM) => void;
  onDelete?: (transaction: TransactionListItemVM) => void;
  onDateRangeSearch?: (range: { fromDate?: Date; toDate?: Date }) => void | Promise<void>;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  items,
  loading,
  onDelete,
  onEdit,
  onDateRangeSearch,
}) => {
  const [fromDate, setFromDate] = React.useState('');
  const [toDate, setToDate] = React.useState('');
  const [dateRangeError, setDateRangeError] = React.useState('');

  const handleApplyDateRange = async () => {
    if (fromDate && toDate && fromDate > toDate) {
      setDateRangeError('開始日期不可晚於結束日期');
      return;
    }

    setDateRangeError('');
    await onDateRangeSearch?.({
      fromDate: fromDate ? new Date(`${fromDate}T00:00:00`) : undefined,
      toDate: toDate ? new Date(`${toDate}T23:59:59.999`) : undefined,
    });
  };

  const handleClearDateRange = async () => {
    setFromDate('');
    setToDate('');
    setDateRangeError('');
    await onDateRangeSearch?.({});
  };

  const groupedItems = React.useMemo(() => {
    const groups: Record<string, TransactionListItemVM[]> = {};

    items.forEach((item) => {
      const key = item.monthKey;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // Sort items within each group by date descending
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => b.sortTimestamp - a.sortTimestamp);
    });

    // Return entries sorted by key (month) descending
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">Loading transactions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-3 pb-4 border-b border-border">
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
          <div className="w-full md:min-w-56 md:max-w-64 md:flex-1">
            <label className="mb-1 block font-mono text-[10px] tracking-widest text-muted-foreground">
              FROM
            </label>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="font-mono"
            />
          </div>
          <div className="w-full md:min-w-56 md:max-w-64 md:flex-1">
            <label className="mb-1 block font-mono text-[10px] tracking-widest text-muted-foreground">
              TO
            </label>
            <Input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="font-mono"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full font-mono md:w-auto"
            onClick={() => void handleApplyDateRange()}
          >
            APPLY
          </Button>
          <Button
            type="button"
            variant="text"
            className="w-full font-mono md:w-auto"
            disabled={!fromDate && !toDate}
            onClick={() => void handleClearDateRange()}
          >
            CLEAR
          </Button>
        </div>
        {dateRangeError ? <p className="mt-2 text-xs text-destructive">{dateRangeError}</p> : null}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">No transactions found.</div>
          </CardContent>
        </Card>
      ) : null}

      {groupedItems.map(([month, transactions]) => (
        <section key={month} className="relative">
          <div className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm pt-2 pb-3 mb-2 -mx-4 px-4 flex items-center justify-between border-b border-border/50">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">
              {month}
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">
              {transactions.length} 筆交易
            </span>
          </div>
          <div className="bg-card rounded-lg border border-border overflow-hidden divide-y divide-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((item) => (
                  <TransactionItem
                    key={item.id}
                    transaction={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );
};
