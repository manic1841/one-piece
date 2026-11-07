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
import { DynamicCategorySelector } from './DynamicCategorySelector';
import { ExpenseCategoryPicker } from './ExpenseCategoryPicker';

type ExpensePanelProps = {
  projects: TransactionFormProjectOption[];
  categories: TransactionFormCategoryOption[];
  allLedgerCodes: LedgerCodeItem[];
};

/**
 * Expense panel: amount → category (one required decision) → project attribution
 * → note. The detail code follows its category and the date follows the pair, so
 * the quick path is a single downward glance. Quick path = amount + category.
 */
export function ExpensePanel({ projects, categories, allLedgerCodes }: ExpensePanelProps) {
  const selectIntent = useIntentSelection();

  return (
    <div className="space-y-5">
      <AmountField />

      <FormField name="intent">
        <FormItem>
          <FormLabel required>類別</FormLabel>
          <ExpenseCategoryPicker categories={categories} onChange={selectIntent} />
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
            <TextArea placeholder="補充這筆支出的脈絡" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  );
}
