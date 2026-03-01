import { ProjectDetailItemColors } from '@/constants/project/color';
import { RecordCategoryOptions } from '@/constants/record/category';
import { ProjectDetailType } from '@/domains/project/types';
import { type ProjectDetailData } from '@/domains/project/types';

export const useProjectDetailItem = (item: ProjectDetailData) => {
  const isIncome =
    item.type === ProjectDetailType.INCOME || item.type === ProjectDetailType.TRANSFER_INCOME;
  const color = ProjectDetailItemColors[item.type];

  const category =
    [
      ...RecordCategoryOptions.income,
      ...RecordCategoryOptions.expense,
      ...RecordCategoryOptions.transfer,
      ...RecordCategoryOptions.planned,
    ].find((option) => option.value === item.category)?.label || item.category;

  return {
    isIncome,
    color,
    category,
  };
};
