import React from 'react';

import { Card, CardContent } from '@/ui/components/ui/card';
import { type TransactionListItemVM } from '@/ui/features/transaction/viewmodels/transaction-list.vm';

import { TransactionItem } from './TransactionItem';

interface TransactionListProps {
  items: TransactionListItemVM[];
  loading: boolean;
  onEdit?: (transaction: TransactionListItemVM) => void;
  onDelete?: (transaction: TransactionListItemVM) => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  items,
  loading,
  onDelete,
  onEdit,
}) => {
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

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">No transactions found.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
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
