import { useFormField } from '@/ui/components/form';
import { cn } from '@/ui/utils/cn';

type ChipGroupProps = {
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange: (value: string) => void;
};

const chipClass =
  'rounded-sm border border-border bg-muted text-foreground hover:border-border hover:bg-muted px-3 py-1.5 text-sm font-medium transition-colors';
const chipActiveClass = 'border-primary bg-primary text-primary-foreground';

export function ChipGroup({ options, value, onChange }: ChipGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(chipClass, selected && chipActiveClass)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * `ChipGroup` bound to the surrounding `FormField`. Buttons are not native
 * inputs, so `FormControl` cannot inject the binding — the glue lives here
 * instead, exactly like the Radix `Switch` case.
 */
export function FormChipGroup({ options }: { options: Array<{ value: string; label: string }> }) {
  const { field } = useFormField();
  return (
    <ChipGroup
      options={options}
      value={(field.value as string | undefined) ?? ''}
      onChange={field.onChange}
    />
  );
}
