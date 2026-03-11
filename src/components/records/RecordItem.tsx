import type React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { useRecordItem } from '@/components/records/useRecordItem';
import { Button } from '@/components/ui/button';
import { RecordCategoryLabels } from '@/constants/record/category';
import { type Project } from '@/domains/project/types';
import { type Record, RecordFormType, RecordType } from '@/domains/record/types';
import { formatDate } from '@/utils/dateUtils';
import { formatCurrency } from '@/utils/formatUtils';

interface RecordItemProps {
  record: Record;
  onEdit: (record: Record) => void;
  onDelete: (record: Record) => void;
  projects?: Project[];
}

export const RecordItem: React.FC<RecordItemProps> = ({
  record,
  onEdit,
  onDelete,
  projects,
}: RecordItemProps) => {
  const { color } = useRecordItem({ record });

  const getRecordTitle = () => {
    if (!record.category && !record.description) return '';

    let typeKey = '';
    if (record.recordType === RecordType.PROJECT_TRANSACTION) {
      typeKey = 'transfer';
    } else if (record.recordType === RecordType.PLANNED_INCOME) {
      typeKey = 'planned';
    } else {
      typeKey = record.formType === RecordFormType.EXPENSE ? 'expense' : 'income';
    }
    const labels = RecordCategoryLabels[typeKey as keyof typeof RecordCategoryLabels];
    const label = labels[record.category as keyof typeof labels] || record.category;

    return record.description ? label + ' (' + record.description + ')' : label;
  };

  return (
    <div className={`p-4 hover:bg-accent/50 transition-colors bg-${color}-50/30`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full bg-${color}-500`} />
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{getRecordTitle()}</p>
                {record.recordType === RecordType.PLANNED_INCOME && (
                  <span
                    className={`text-xs px-2 py-0.5 bg-${color}-100 text-${color}-700 rounded-full`}
                  >
                    Planned Income
                  </span>
                )}
                {record.recordType === RecordType.TRANSACTION && record.projectId && (
                  <span className={`text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full`}>
                    {projects?.find((p) => p.id === record.projectId)?.name + '專案' ||
                      'Unknown Project'}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(record.date)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className={`text-lg font-bold text-${color}-600`}>
            {record.formType == RecordFormType.INCOME ? '+' : '-'}
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
