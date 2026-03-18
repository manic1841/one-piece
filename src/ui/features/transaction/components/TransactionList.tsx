import React from 'react';

import { Card, CardContent } from '@/ui/components/ui/card';
import { type Project } from '@/infra/schemas/project';
import { type Transaction as LedgerTransaction } from '@/infra/schemas/ledger';
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
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, LedgerTransaction[]> = {};

    items.forEach((item) => {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}å¹?{(date.getMonth() + 1).toString().padStart(2, '0')}?ˆ`;
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
          <div className="text-center text-muted-foreground">
            No transactions found.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedItems.map(([month, transactions]) => (
        <section key={month}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 ml-1 uppercase tracking-wider">
            {month}
          </h3>
          <Card>
            <div className="divide-y divide-border">
              {transactions.map((item) => (
                <div key={item.id}>
                  <TransactionItem
                    transaction={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    projectName={projects?.find((p) => p.id === item.projectId)?.name}
                  />
                </div>
              ))}
            </div>
          </Card>
        </section>
      ))}
    </div>
  );
};
