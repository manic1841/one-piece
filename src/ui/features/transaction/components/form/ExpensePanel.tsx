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

type ExpensePanelProps = {
  projects: TransactionFormProjectOption[];
  categories: TransactionFormCategoryOption[];
  allLedgerCodes: LedgerCodeItem[];
};

const toProjectOptions = (projects: TransactionFormProjectOption[]) =>
  projects.map((project) => ({
    value: project.id,
    label: `${project.name}`,
  }));

export function ExpensePanel({ projects, categories, allLedgerCodes }: ExpensePanelProps) {
  const { control } = useFormContext();
  const triggerAllocation = useWatch({ control, name: 'triggerAllocation' });

  return (
    <div className="space-y-5">
      <AmountDateFields />
      <FormField name="projectId">
        <FormItem>
          <FormLabel>專案</FormLabel>
          <FormChipGroup options={toProjectOptions(projects)} />
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField name="intent">
        <FormItem>
          <FormLabel>費用類別</FormLabel>
          <FormChipGroup options={categories} />
          <FormMessage />
        </FormItem>
      </FormField>

      <DynamicCategorySelector allLedgerCodes={allLedgerCodes} />

      <FormField name="description">
        <FormItem>
          <FormLabel>說明</FormLabel>
          <FormControl>
            <TextArea placeholder="補充這筆支出的脈絡" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField name="triggerAllocation">
        <TransactionAllocationToggle label="支出分配" />
      </FormField>

      {triggerAllocation ? <AllocationSection projects={projects} title="支出分攤" /> : null}
    </div>
  );
}
