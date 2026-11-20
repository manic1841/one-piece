import { useFormField } from '@/ui/components/form';
import { cn } from '@/ui/utils/cn';

type ChipGroupProps = {
  /** Accessible name of the chip group, e.g. the field it belongs to. */
  'aria-label'?: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
  onChange: (value: string) => void;
  /** Re-clicking the selected chip emits `''`, for optional single-choice fields. */
  allowDeselect?: boolean;
};

const chipClass =
  'rounded-sm border border-border bg-muted text-foreground px-3 py-1.5 text-sm font-medium ring-offset-background transition-[color,background-color,border-color,transform] duration-fast ease-out-quint hover:border-border-strong hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97]';
// Selected keeps its primary surface on hover (accent would be lower specificity
// and darken it); the hover feedback is a slight dim, matching `button` default.
const chipActiveClass =
  'border-primary bg-primary text-primary-foreground hover:border-primary hover:bg-primary/90';

/** One chip. Both groups render this so a single and a multi selection match. */
const Chip = ({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onClick}
    className={cn(chipClass, selected && chipActiveClass)}
  >
    {label}
  </button>
);

export function ChipGroup({
  'aria-label': ariaLabel,
  options,
  value,
  onChange,
  allowDeselect,
}: ChipGroupProps) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Chip
            key={option.value}
            label={option.label}
            selected={selected}
            onClick={() => onChange(selected && allowDeselect ? '' : option.value)}
          />
        );
      })}
    </div>
  );
}

/**
 * `ChipGroup` bound to the surrounding `FormField`. Buttons are not native
 * inputs, so `FormControl` cannot inject the binding — the glue lives here
 * instead, exactly like the Radix `Switch` case. `onChange` runs after the
 * binding, for callers that also need to react to the selection.
 */
export function FormChipGroup({
  'aria-label': ariaLabel,
  options,
  onChange,
  allowDeselect,
}: {
  'aria-label'?: string;
  options: Array<{ value: string; label: string }>;
  onChange?: (value: string) => void;
  allowDeselect?: boolean;
}) {
  const { field } = useFormField();
  return (
    <ChipGroup
      aria-label={ariaLabel}
      options={options}
      value={(field.value as string | undefined) ?? ''}
      allowDeselect={allowDeselect}
      onChange={(value) => {
        field.onChange(value);
        onChange?.(value);
      }}
    />
  );
}

type ToggleChipGroupProps = {
  /** Accessible name of the chip group, e.g. the field it belongs to. */
  'aria-label': string;
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onToggle: (value: string) => void;
};

/**
 * Multi-select chip row: each chip toggles on/off independently and exposes its
 * state via `aria-pressed`. Reuses `Chip`, so a single selection and a multi
 * selection read as the same control at different counts.
 */
export function ToggleChipGroup({
  'aria-label': ariaLabel,
  options,
  selectedValues,
  onToggle,
}: ToggleChipGroupProps) {
  const selected = new Set(selectedValues);
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.label}
          selected={selected.has(option.value)}
          onClick={() => onToggle(option.value)}
        />
      ))}
    </div>
  );
}
