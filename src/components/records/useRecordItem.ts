import { useEffect, useState } from 'react';

import { RecordColors } from '@/constants/record/colors';
import { type Record, RecordType, TransactionType } from '@/domains/record/types';

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

  return { color };
};
