import * as React from 'react';

import { cn } from '@/ui/utils/cn';

type RadioGroupProps = {
  /** Accessible name for the group, wired via role="radiogroup" aria-label. */
  'aria-label': string;
  name: string;
  value?: string;
  /** Emits the selected value, not the DOM event. */
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
};

type RadioOptionProps = {
  value: string;
  label: string;
  className?: string;
};

/** Inline single selection from a mutually exclusive set. Native input; no Radix dependency. */
export function RadioGroup({
  name,
  value,
  onValueChange,
  children,
  className,
  ...aria
}: RadioGroupProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) onValueChange?.(event.target.value);
  };

  return (
    <div role="radiogroup" className={cn('flex items-center gap-6', className)} {...aria}>
      {React.Children.map(children, (child) =>
        React.isValidElement<RadioOptionProps>(child)
          ? React.cloneElement(child, {
              name,
              checked: value === child.props.value,
              onChange: handleChange,
            } as Partial<RadioOptionProps>)
          : child,
      )}
    </div>
  );
}

type RadioProps = {
  name?: string;
  checked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

/** One option inside RadioGroup: label wraps the native input, so no htmlFor wiring is needed. */
export function Radio({
  value,
  label,
  checked,
  className,
  ...radio
}: RadioProps & RadioOptionProps) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2 text-sm', className)}>
      <span className="relative inline-flex h-[18px] w-[18px] shrink-0">
        <input
          type="radio"
          value={value}
          checked={checked}
          className="peer h-full w-full cursor-pointer appearance-none rounded-full border border-strong bg-transparent p-0 transition-colors duration-fast ease-out-quint checked:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          {...radio}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto h-2 w-2 rounded-full bg-transparent peer-checked:bg-primary"
        />
      </span>
      <span className="text-foreground">{label}</span>
    </label>
  );
}
