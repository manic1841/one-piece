import { RetirementIncomeImportSource, RetirementIncomeType } from '@/domains/retirement/types';

export const RetirementIncomeTypeLabel = {
  [RetirementIncomeType.SALARY]: '薪資',
  [RetirementIncomeType.BONUS]: '獎金',
  [RetirementIncomeType.PENSION]: '退休金',
  [RetirementIncomeType.RENT]: '租金',
  [RetirementIncomeType.OTHER]: '其他',
};

export const RetirementIncomeTypeOptions = Object.entries(RetirementIncomeTypeLabel).map(
  ([key, value]) => ({
    value: key,
    label: value,
  }),
);

export const RetirementIncomeImportSourceLabel = {
  [RetirementIncomeImportSource.MANUAL]: '手動',
  [RetirementIncomeImportSource.PLANNED_INCOME]: '從計畫收入匯入',
};
