import {
  DateInput,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
} from '@/ui/components/form';

/**
 * Hero amount. The form is narrow enough that nothing shares its row, so it
 * keeps the full width as the entry point.
 *
 * The `md:text-2xl` is deliberate: the `ui/input` primitive sets `text-base
 * md:text-sm`, so a bare `text-2xl` would be there on mobile too and lose to
 * that media query on wide screens. Mobile keeps the 16px base (design-system
 * § Hero 金額).
 */
export function AmountField() {
  return (
    <FormField name="amount">
      <FormItem>
        <FormLabel required>金額</FormLabel>
        <FormControl>
          <NumberInput
            min="0.01"
            step="0.01"
            placeholder="0.00"
            className="h-14 text-base font-semibold md:text-2xl"
            data-testid="amount-hero"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
  );
}

/** Date stays out of the amount/category pair: it is prefilled with today. */
export function DateField() {
  return (
    <FormField name="date">
      <FormItem>
        <FormLabel required>日期</FormLabel>
        <FormControl>
          <DateInput />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
  );
}
