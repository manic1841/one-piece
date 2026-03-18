import { ProjectDetailType } from '@/domains/project/types/detail';

export const IncomeColor = 'green';
export const ExpenseColor = 'red';
export const SnapshotColor = 'slate';
export const RecordColor = 'blue';

export const ProjectDetailItemColors = {
  [ProjectDetailType.RECORD]: RecordColor,
  [ProjectDetailType.SNAPSHOT]: SnapshotColor,
} as const;
