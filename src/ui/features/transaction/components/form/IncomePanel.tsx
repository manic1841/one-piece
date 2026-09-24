import { useFormContext, useWatch } from 'react-hook-form';

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

import { AllocationSection } from './AllocationSection';
import { AmountDateFields } from './AmountDateFields';
import { FormChipGroup } from './ChipGroup';
import { DynamicCategorySelector } from './DynamicCategorySelector';
import { TransactionAllocationToggle } from './TransactionAllocationToggle';

type IncomePanelProps = {
  categories: TransactionFormCategoryOption[];
  projects: TransactionFormProjectOption[];
  allLedgerCodes: LedgerCodeItem[];
};

export function IncomePanel({ categories, projects, allLedgerCodes }: IncomePanelProps) {
  const { control } = useFormContext();
  const triggerAllocation = useWatch({ control, name: 'triggerAllocation' });

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-5">
      <AmountDateFields />
      <FormField name="intent">
        <FormItem>
          <FormLabel>收入類別</FormLabel>
          <FormChipGroup options={categories} tone="income" />
          <FormMessage />
        </FormItem>
      </FormField>

      <DynamicCategorySelector allLedgerCodes={allLedgerCodes} />

      <FormField name="description">
        <FormItem>
          <FormLabel>說明</FormLabel>
          <FormControl>
            <TextArea placeholder="例如：薪資、獎金、退款回補" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField name="triggerAllocation">
        <TransactionAllocationToggle tone="income" label="收入分配" />
      </FormField>

      {triggerAllocation ? (
        <AllocationSection projects={projects} title="收入分配" tone="income" />
      ) : null}
    </div>
  );
}
