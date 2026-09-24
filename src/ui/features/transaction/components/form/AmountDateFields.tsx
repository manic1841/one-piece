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
 * The amount + date pair every transaction tab starts with. It is a *group*
 * glue component: each half is its own `FormField`, so the panels keep the
 * standard label / control / error layout without repeating it five times.
 */
export function AmountDateFields() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormField name="amount">
        <FormItem>
          <FormLabel required>金額</FormLabel>
          <FormControl>
            <NumberInput min="0.01" step="0.01" placeholder="0.00" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField name="date">
        <FormItem>
          <FormLabel required>日期</FormLabel>
          <FormControl>
            <DateInput />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  );
}
