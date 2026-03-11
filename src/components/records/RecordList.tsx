import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { type Project } from '@/domains/project/types';
import { type Record as DomainRecord } from '@/domains/record/types';

import { RecordItem } from './RecordItem';

interface RecordListProps {
  items: DomainRecord[];
  loading: boolean;
  onEdit: (record: DomainRecord) => void;
  onDelete: (record: DomainRecord) => void;
  projects?: Project[];
}

export const RecordList: React.FC<RecordListProps> = ({
  items,
  loading,
  onDelete,
  onEdit,
  projects,
}) => {
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, DomainRecord[]> = {};

    items.forEach((item) => {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月`;
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
          <div className="text-center text-muted-foreground">Loading records...</div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            No transactions found. Click "Record Income" or "Add Expense" to get started.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedItems.map(([month, records]) => (
        <section key={month}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 ml-1 uppercase tracking-wider">
            {month}
          </h3>
          <Card>
            <div className="divide-y divide-border">
              {records.map((item) => (
                <div key={item.id}>
                  <RecordItem
                    record={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    projects={projects}
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
