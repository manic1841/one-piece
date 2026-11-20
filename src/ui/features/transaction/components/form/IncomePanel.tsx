import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  TextArea,
} from '@/ui/components/form';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { useIntentSelection } from '@/ui/features/transaction/hooks/useIntentSelection';
import {
  type TransactionFormCategoryOption,
  type TransactionFormProjectOption,
} from '@/ui/features/transaction/types/transaction';

import { AllocationSection } from './AllocationSection';
import { AmountField, DateField } from './AmountFields';
import { FormChipGroup } from './ChipGroup';
import { DynamicCategorySelector } from './DynamicCategorySelector';

type IncomePanelProps = {
  categories: TransactionFormCategoryOption[];
  projects: TransactionFormProjectOption[];
  allLedgerCodes: LedgerCodeItem[];
};

/** Income panel: same rhythm as the expense panel, so the two tabs read alike. */
export function IncomePanel({ categories, projects, allLedgerCodes }: IncomePanelProps) {
  const selectIntent = useIntentSelection();

  return (
    <div className="space-y-5">
      <AmountField />

      <FormField name="intent">
        <FormItem>
          <FormLabel required>類別</FormLabel>
          <FormChipGroup aria-label="類別" options={categories} onChange={selectIntent} />
          <FormMessage />
        </FormItem>
      </FormField>

      <DynamicCategorySelector allLedgerCodes={allLedgerCodes} />

      <DateField />

      <AllocationSection projects={projects} />

      <FormField name="description">
        <FormItem>
          <FormLabel>說明</FormLabel>
          <FormControl>
            <TextArea placeholder="例如：薪資、獎金、退款回補" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  );
}
