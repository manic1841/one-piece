import { useFormContext, useWatch } from 'react-hook-form';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SelectField,
} from '@/ui/components/form';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { DEFAULT_INTENT_MAPPINGS } from '@/ui/features/transaction/viewmodels/transaction.vm';
import { buildUserSelectOptions } from '@/ui/features/transaction/viewmodels/userSelectOptions';

type DynamicCategorySelectorProps = {
  allLedgerCodes: LedgerCodeItem[];
};

/**
 * Renders the user-selectable detail codes for the currently chosen category.
 * It reads `intent` and binds `ledgerCode`, both through the surrounding form
 * context, so it disappears when the category has no user-selectable options.
 */
export function DynamicCategorySelector({ allLedgerCodes }: DynamicCategorySelectorProps) {
  const { control } = useFormContext();
  const intent = useWatch({ control, name: 'intent' });

  const mapping = DEFAULT_INTENT_MAPPINGS.find((m) => m.intent === intent);
  const options = buildUserSelectOptions(mapping, allLedgerCodes);

  if (!options) return null;

  return (
    <FormField name="ledgerCode">
      <FormItem className="mt-4 rounded-lg border border-border bg-muted p-3">
        <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          屬性 / 詳細類別
        </FormLabel>
        <FormControl>
          <SelectField
            options={options.map((option) => ({ value: option.code, label: option.label }))}
            placeholder="選擇具體項目..."
            className="bg-card"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
  );
}
