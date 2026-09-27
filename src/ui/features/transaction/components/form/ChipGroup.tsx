import { useFormField } from '@/ui/components/form';
import { cn } from '@/ui/utils/cn';

export type ChipGroupTone = 'expense' | 'income' | 'neutral';

type ChipGroupProps = {
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange: (value: string) => void;
  tone: ChipGroupTone;
};

export function ChipGroup({ options, value, onChange, tone }: ChipGroupProps) {
  const toneClass = {
    expense:
      'border-negative/20 bg-negative/10 text-negative hover:border-negative/30 hover:bg-negative/15',
    income:
      'border-positive/20 bg-positive/10 text-positive hover:border-positive/30 hover:bg-positive/15',
    neutral: 'border-border bg-muted text-foreground hover:border-border hover:bg-muted',
  };

  const activeClass = {
    expense: 'border-negative bg-negative text-primary-foreground',
    income: 'border-positive bg-positive text-primary-foreground',
    neutral: 'border-primary bg-primary text-primary-foreground',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-sm border px-3 py-1.5 text-sm font-medium transition-colors',
              selected ? activeClass[tone] : toneClass[tone],
            )}
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
export function FormChipGroup({
  options,
  tone,
}: {
  options: Array<{ value: string; label: string }>;
  tone: ChipGroupTone;
}) {
  const { field } = useFormField();
  return (
    <ChipGroup
      options={options}
      value={(field.value as string | undefined) ?? ''}
      onChange={field.onChange}
      tone={tone}
    />
  );
}
