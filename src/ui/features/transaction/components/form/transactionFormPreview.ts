import { getIntentTypeLabel, getTransactionCategoryLabel } from '@/ui/constants/transaction';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import {
  type TransactionFormOutput,
  type TransactionFormProjectOption,
} from '@/ui/features/transaction/types/transaction';

const findProjectLabel = (projects: TransactionFormProjectOption[], projectId?: string) => {
  if (!projectId) return '';
  const project = projects.find((item) => item.id === projectId);
  return project ? `${project.name}` : '';
};

const describeAllocation = (
  projects: TransactionFormProjectOption[],
  items: TransactionFormOutput['allocationItems'],
) =>
  (items ?? [])
    .map(
      (item) =>
        `${findProjectLabel(projects, item.projectId) || item.projectId} ${item.percentage}%`,
    )
    .join('、');

/**
 * Turns the derived preview payload into the display chips shown above the
 * footer. Pure presentation — the preview itself comes from the active tab's
 * schema (see `transactionForm.vm.ts`), not from here.
 *
 * The household's own codes are looked up first, so a custom detail code reads
 * as its label instead of the raw `expense:…` string.
 */
export const buildPreviewDetails = (input: {
  preview: TransactionFormOutput | null;
  projects: TransactionFormProjectOption[];
  ledgerCodes: LedgerCodeItem[];
}) => {
  const { preview, projects, ledgerCodes } = input;

  if (!preview) return [] as string[];

  const categoryLabel = getTransactionCategoryLabel({
    intent: preview.intent,
    ledgerCode: preview.ledgerCode,
    getLedgerLabel: (code) => ledgerCodes.find((item) => item.code === code)?.label ?? code,
  });
  const isSplit = Boolean(preview.allocationItems?.length);

  if (preview.intentType === 'EXPENSE') {
    return [
      categoryLabel,
      isSplit ? describeAllocation(projects, preview.allocationItems) : '',
      isSplit ? '' : findProjectLabel(projects, preview.projectId),
      isSplit ? '送出後需分攤' : '直接入帳',
      preview.date,
    ].filter(Boolean);
  }

  if (preview.intentType === 'INCOME') {
    return [
      categoryLabel,
      isSplit ? describeAllocation(projects, preview.allocationItems) : '',
      isSplit ? '' : findProjectLabel(projects, preview.projectId),
      isSplit ? '送出後需分配' : '直接入帳',
      preview.date,
    ].filter(Boolean);
  }

  return [
    getIntentTypeLabel(preview.intentType),
    categoryLabel,
    findProjectLabel(projects, preview.projectId),
    preview.date,
  ].filter(Boolean);
};
