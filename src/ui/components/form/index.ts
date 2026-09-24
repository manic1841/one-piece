/**
 * Form suite public entry (ADR-0064 / ADR-0065).
 *
 * RHF-free field components plus the RHF glue (`Form`, `FormField`,
 * `FormItem`, `FormLabel`, `FormControl`, `FormMessage`). Consumers import from
 * this barrel. Contracts live in `docs/ui/design-system.md` §7 and
 * `ui-layer-architecture.md` §4.
 */
export { Form } from './Form';
export { FormField } from './FormField';
export { FormItem } from './FormItem';
export { FormLabel } from './FormLabel';
export { FormControl } from './FormControl';
export { FormDescription } from './FormDescription';
export { FormMessage } from './FormMessage';

export { TextInput } from './TextInput';
export { NumberInput } from './NumberInput';
export { CurrencyInput } from './CurrencyInput';
export { DateInput } from './DateInput';
export { SelectField } from './Select';
export { TextArea } from './TextArea';
export { useFormField } from './form-context';

export type { TextInputProps } from './TextInput';
export type { NumberInputProps } from './NumberInput';
export type { CurrencyInputProps } from './CurrencyInput';
export type { DateInputProps } from './DateInput';
export type { SelectFieldProps, SelectFieldOption } from './Select';
export type { TextAreaProps } from './TextArea';
