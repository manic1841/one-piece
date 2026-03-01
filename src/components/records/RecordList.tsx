import React from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { type Project } from '@/domains/project/types';
import { type Record } from '@/domains/record/types';

import { RecordItem } from './RecordItem';

interface RecordListProps {
  items: Record[];
  loading: boolean;
  onEdit: (record: Record) => void;
  onDelete: (record: Record) => void;
  projects?: Project[];
}

export const RecordList: React.FC<RecordListProps> = ({
  items,
  loading,
  onDelete,
  onEdit,
  projects,
}) => {
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
        {items.map((item) => (
          <div key={item.id}>
            <RecordItem record={item} onEdit={onEdit} onDelete={onDelete} projects={projects} />
          </div>
        ))}
      </div>
    </Card>
  );
};
