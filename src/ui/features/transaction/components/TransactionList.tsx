import React from 'react';

import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Input } from '@/ui/components/ui/input';
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
      <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full md:w-56">
            <label className="mb-1 block text-xs font-semibold text-gray-500">開始日期</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </div>
          <div className="w-full md:w-56">
            <label className="mb-1 block text-xs font-semibold text-gray-500">結束日期</label>
            <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-auto"
            onClick={() => void handleApplyDateRange()}
          >
            查詢日期區間
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full md:w-auto"
            disabled={!fromDate && !toDate}
            onClick={() => void handleClearDateRange()}
          >
            清除日期篩選
          </Button>
        </div>
        {dateRangeError ? <p className="mt-2 text-xs text-rose-600">{dateRangeError}</p> : null}
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
          <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-sm pt-2 pb-3 mb-2 -mx-4 px-4 flex items-center justify-between border-b border-gray-100/50">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">{month}</h3>
            <span className="text-[10px] text-gray-300 font-medium">
              {transactions.length} 筆交易
            </span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {transactions.map((item) => (
              <div key={item.id}>
                <TransactionItem transaction={item} onEdit={onEdit} onDelete={onDelete} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
