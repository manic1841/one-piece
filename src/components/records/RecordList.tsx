import { Card, CardContent } from '@/components/ui/card';
import { type Record } from '@/domains/record/types';
import React from 'react';

import { RecordItem } from './RecordItem';

interface RecordListProps {
  items: Record[];
  loading: boolean;
  onEdit: (record: Record) => void;
  onDelete: (record: Record) => void;
}

export const RecordList: React.FC<RecordListProps> = ({ items, loading, onDelete, onEdit }) => {
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
    <Card>
      <div className="divide-y divide-border">
        {items.map((item) => {
          return (
            <div key={item.id}>
              <RecordItem record={item} onEdit={onEdit} onDelete={onDelete} />
            </div>
          );
        })}
      </div>
    </Card>
  );
};
