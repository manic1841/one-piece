import React from 'react';

import { type Transaction as LedgerTransaction } from '@/domains/ledger/schemas';
import { type Project } from '@/domains/project/schemas';
import { Card, CardContent } from '@/ui/components/ui/card';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';

import { TransactionItem } from './TransactionItem';

interface TransactionListProps {
  items: LedgerTransaction[];
  loading: boolean;
  onEdit?: (transaction: LedgerTransaction) => void;
  onDelete?: (transaction: LedgerTransaction) => void;
  projects?: Project[];
}

export const TransactionList: React.FC<TransactionListProps> = ({
  items,
  loading,
  onDelete,
  onEdit,
  projects,
}) => {
  const { getLabel } = useLedgerCodes();
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, LedgerTransaction[]> = {};

    items.forEach((item) => {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // Sort items within each group by date descending
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">
              {month}
            </h3>
            <span className="text-[10px] text-gray-300 font-medium">
              {transactions.length} 筆交易
            </span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {transactions.map((item) => (
              <div key={item.id}>
                <TransactionItem
                  transaction={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  projectName={projects?.find((p) => p.id === item.projectId)?.name}
                  getLabel={getLabel}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
