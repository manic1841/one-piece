import { RecordColors } from '@/constants/record/colors';
import { type Record, RecordType, TransactionType } from '@/domains/record/types';
import { useEffect, useState } from 'react';

interface UseRecordItemProps {
  record: Record;
}

export const useRecordItem = ({ record }: UseRecordItemProps) => {
  const [color, setColor] = useState<string>(RecordColors.income);

  useEffect(() => {
    const determineColor = async () => {
      let color = null;
      switch (record.recordType) {
        case RecordType.PLANNED_INCOME:
          color = RecordColors.income;
          break;
        case RecordType.PROJECT_TRANSACTION:
          color = RecordColors.transfer;
          break;
        case RecordType.TRANSACTION:
          color =
            record.transactionType === TransactionType.EXPENSE
              ? RecordColors.expense
              : RecordColors.income;
          break;
      }
      setColor(color!);
    };
    determineColor();
  }, [record]);

  const formatDate = (date: Date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return { color, formatDate };
};
