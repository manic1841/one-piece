import { getIntentTypeLabel } from '@/ui/constants/transaction';
import {
  type TransactionFormCategoryOption,
  type TransactionFormOutput,
  type TransactionFormProjectOption,
} from '@/ui/features/transaction/types/transaction';

const findProjectLabel = (projects: TransactionFormProjectOption[], projectId?: string) => {
  if (!projectId) return '';
  const project = projects.find((item) => item.id === projectId);
  return project ? `${project.name}` : '';
};

const findCategoryLabel = (categories: TransactionFormCategoryOption[], ledgerCode?: string) => {
  if (!ledgerCode) return '';
  return categories.find((item) => item.value === ledgerCode)?.label ?? ledgerCode;
};

/**
 * Turns the derived preview payload into the display chips shown above the
 * footer. Pure presentation — the preview itself comes from the active tab's
 * schema (see `transactionForm.vm.ts`), not from here.
 */
export const buildPreviewDetails = (input: {
  preview: TransactionFormOutput | null;
  projects: TransactionFormProjectOption[];
  expenseCategories: TransactionFormCategoryOption[];
  incomeCategories: TransactionFormCategoryOption[];
  advancedCategories: TransactionFormCategoryOption[];
}) => {
  const { preview, projects, expenseCategories, incomeCategories, advancedCategories } = input;

  if (!preview) return [] as string[];

  if (preview.intentType === 'EXPENSE') {
    return [
      findProjectLabel(projects, preview.projectId),
      findCategoryLabel(expenseCategories, preview.ledgerCode),
      preview.triggerAllocation ? '送出後需分攤' : '直接入帳',
      preview.date,
    ].filter(Boolean);
  }

  if (preview.intentType === 'INCOME') {
    return [
      findCategoryLabel(incomeCategories, preview.ledgerCode),
      preview.triggerAllocation ? '送出後需分配' : '直接入帳',
      preview.date,
    ].filter(Boolean);
  }

  return [
    getIntentTypeLabel(preview.intentType),
    findCategoryLabel(advancedCategories, preview.ledgerCode),
    findProjectLabel(projects, preview.projectId),
    preview.date,
  ].filter(Boolean);
};
