import { type ProjectDetailData } from '@/domains/project/types/detail';
import { ExpenseSubCategoryLabel, IncomeSubCategoryLabel } from '@/domains/report/labels';
import { ProjectDetailItemColors } from '@/ui/constants/project/color';

export const useProjectDetailItem = (item: ProjectDetailData) => {
  const isIncome = !item.isNegative;

  // Safe color lookup
  const colorKey = item.type as keyof typeof ProjectDetailItemColors;
  const color = ProjectDetailItemColors[colorKey] || 'blue';

  const categoryLabel =
    IncomeSubCategoryLabel[item.category as keyof typeof IncomeSubCategoryLabel] ||
    ExpenseSubCategoryLabel[item.category as keyof typeof ExpenseSubCategoryLabel] ||
    item.category;

  return {
    isIncome,
    color,
    category: categoryLabel,
  };
};
