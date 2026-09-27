import { useFormContext } from 'react-hook-form';

import { useFormField } from '@/ui/components/form';
import { Checkbox } from '@/ui/components/ui/checkbox';
import { cn } from '@/ui/utils/cn';

const toneClass = {
  expense: 'border-negative/20 bg-negative/10 text-negative',
  income: 'border-positive/20 bg-positive/10 text-positive',
};

const checkboxClass = {
  expense: 'border-negative',
  income: 'border-positive',
};

/**
 * The "trigger allocation" checkbox, bound to `triggerAllocation`. A Radix
 * checkbox is not a native value/onChange input, so the binding lives here via
 * `useFormField`; switching it off also clears the allocation rows.
 */
export function TransactionAllocationToggle({
  tone,
  label,
}: {
  tone: 'expense' | 'income';
  label: string;
}) {
  const { field } = useFormField();
  const { setValue } = useFormContext();

  return (
    <label
      className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 text-sm', toneClass[tone])}
    >
      <Checkbox
        checked={Boolean(field.value)}
        onCheckedChange={(checked) => {
          const next = checked === true;
          field.onChange(next);
          if (!next) setValue('allocationItems', []);
        }}
        className={cn('mt-0.5', checkboxClass[tone])}
      />
      <span>{label}</span>
    </label>
  );
}
