import { useFormContext } from 'react-hook-form';

import { useFormField } from '@/ui/components/form';
import { Checkbox } from '@/ui/components/ui/checkbox';

/**
 * The "trigger allocation" checkbox, bound to `triggerAllocation`. A Radix
 * checkbox is not a native value/onChange input, so the binding lives here via
 * `useFormField`; switching it off also clears the allocation rows.
 */
export function TransactionAllocationToggle({ label }: { label: string }) {
  const { field } = useFormField();
  const { setValue } = useFormContext();

  return (
    <label className="flex items-start gap-3 rounded-lg border border-border bg-muted px-4 py-3 text-sm">
      <Checkbox
        checked={Boolean(field.value)}
        onCheckedChange={(checked) => {
          const next = checked === true;
          field.onChange(next);
          if (!next) setValue('allocationItems', []);
        }}
        className="mt-0.5"
      />
      <span>{label}</span>
    </label>
  );
}
