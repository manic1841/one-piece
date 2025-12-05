import type React from 'react';
import { type Record, RecordType } from '@/domains/record/types';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/utils/formatUtils';
import { useRecordItem } from '@/components/records/useRecordItem';

interface RecordItemProps {
  record: Record;
  onEdit: (record: Record) => void;
  onDelete: (record: Record) => void;
}

export const RecordItem: React.FC<RecordItemProps> = ({
  record,
  onEdit,
  onDelete,
}: RecordItemProps) => {
  const { color, formatDate } = useRecordItem({ record });

  return (
    <div className={`p-4 hover:bg-accent/50 transition-colors bg-${color}-50/30`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground capitalize">
                  {record?.category?.replace('_', ' ')}
                </p>
                {record.recordType === RecordType.PLANNED_INCOME && (
                  <span
                    className={`text-xs px-2 py-0.5 bg-${color}-100 text-${color}-700 rounded-full`}
                  >
                    Planned Income
                  </span>
                )}
              </div>
              {record.description && (
                <p className="text-sm text-muted-foreground">{record.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">{formatDate(record.date)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className={`text-lg font-bold text-${color}-600`}>
            {record.amount > 0 ? '+' : ''}
            {formatCurrency(record.amount)}
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(record)}
              className="text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
            >
              <Pencil size={18} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(record)}
              className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 size={18} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
