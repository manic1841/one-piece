import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  TextArea,
} from '@/ui/components/form';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import {
  type TransactionFormCategoryOption,
  type TransactionFormProjectOption,
} from '@/ui/features/transaction/types/transaction';

import { AmountDateFields } from './AmountDateFields';
import { type ChipGroupTone, FormChipGroup } from './ChipGroup';
import { DynamicCategorySelector } from './DynamicCategorySelector';

type CategoryPanelProps = {
  title: string;
  tone: ChipGroupTone;
  categories: TransactionFormCategoryOption[];
  projects: TransactionFormProjectOption[];
  allLedgerCodes: LedgerCodeItem[];
};

const toProjectOptions = (projects: TransactionFormProjectOption[]) =>
  projects.map((project) => ({
    value: project.id,
    label: `${project.name}`,
  }));

export function CategoryPanel({
  title,
  tone,
  categories,
  projects,
  allLedgerCodes,
}: CategoryPanelProps) {
  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-5">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <AmountDateFields />
      <FormField name="projectId">
        <FormItem>
          <FormLabel>專案</FormLabel>
          <FormChipGroup options={toProjectOptions(projects)} tone="neutral" />
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField name="intent">
        <FormItem>
          <FormLabel>類別</FormLabel>
          <FormChipGroup options={categories} tone={tone} />
          <FormMessage />
        </FormItem>
      </FormField>

      <DynamicCategorySelector allLedgerCodes={allLedgerCodes} />

      <FormField name="description">
        <FormItem>
          <FormLabel>說明</FormLabel>
          <FormControl>
            <TextArea placeholder="補充這筆交易的背景" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  );
}
