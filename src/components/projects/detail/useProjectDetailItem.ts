import { RecordCategoryOptions } from '@/constants/record/category';
import { ProjectDetailType } from '@/domains/project/types';
import { type ProjectDetailData } from '@/domains/project/types';

import { ProjectDetailItemColors } from '../../../constants/project/color';

export const useProjectDetailItem = (item: ProjectDetailData) => {
  const isIncome =
    item.type === ProjectDetailType.INCOME || item.type === ProjectDetailType.TRANSFER_INCOME;
  const color = ProjectDetailItemColors[item.type];

  const category = [
    ...RecordCategoryOptions.income,
    ...RecordCategoryOptions.expense,
    ...RecordCategoryOptions.transfer,
  ].find((option) => option.value === item.category)?.label;

  return {
    isIncome,
    color,
    category,
  };
};
