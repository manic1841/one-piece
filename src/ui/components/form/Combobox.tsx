import * as React from 'react';

import { ChevronsUpDown } from 'lucide-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/ui/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/components/ui/popover';
import { cn } from '@/ui/utils/cn';

import { fieldInputClass, fieldInputErrorClass } from './styles';

/** Sentinel item value standing in for the field's empty string. */
const NONE_VALUE = '__none__';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Quiet qualifier printed at the row's end, e.g. how often it is already in use. */
  hint?: string;
  /** Options sharing a group are listed together, in first-seen group order. */
  group?: string;
}

export interface ComboboxFieldProps {
  value?: string;
  /** Emits the selected value (a string), matching the field value contract. */
  onChange?: (value: string) => void;
  onBlur?: () => void;
  options: ComboboxOption[];
  placeholder?: string;
  /** Label for the "no value" row; kept as a separate row so options stay non-empty. */
  noneLabel?: string;
  searchPlaceholder?: string;
  emptyLabel?: string;
  error?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

/**
 * A searchable single-value picker for lists too long to scroll (ledger codes,
 * accounts). Same string value contract as the other fields, so `FormControl`
 * can inject it uniformly; `hint` and `group` let the caller show context the
 * open list would otherwise hide.
 */
export const ComboboxField = React.forwardRef<HTMLButtonElement, ComboboxFieldProps>(
  (
    {
      value,
      onChange,
      onBlur,
      options,
      placeholder,
      noneLabel,
      searchPlaceholder,
      emptyLabel,
      error,
      disabled,
      className,
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);
    const listId = React.useId();
    const normalValue = value ?? '';
    const selected = options.find((option) => option.value === normalValue);
    const triggerLabel =
      normalValue === '' ? (noneLabel ?? placeholder) : (selected?.label ?? normalValue);

    const select = (next: string) => {
      onChange?.(next);
      onBlur?.();
      setOpen(false);
    };

    // First-seen group order keeps the caller in charge of priority (unused above in-use).
    const groups = new Map<string, ComboboxOption[]>();
    for (const option of options) {
      const key = option.group ?? '';
      const bucket = groups.get(key);
      if (bucket === undefined) groups.set(key, [option]);
      else bucket.push(option);
    }

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            disabled={disabled}
            onBlur={onBlur}
            ref={ref}
            className={cn(
              'flex w-full items-center justify-between gap-2 px-3 text-left',
              'rounded-md border border-input bg-background ring-offset-background',
              'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'text-base md:text-sm',
              fieldInputClass,
              error && fieldInputErrorClass,
              className,
            )}
            {...props}
          >
            <span
              className={cn('truncate', normalValue === '' && 'text-muted-foreground')}
              data-testid="combobox-value"
            >
              {triggerLabel}
            </span>
            <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
          onOpenAutoFocus={() => undefined}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder ?? placeholder} />
            <CommandList id={listId}>
              <CommandEmpty className="text-muted-foreground py-6 text-center text-[13px]">
                {emptyLabel ?? 'No matches.'}
              </CommandEmpty>
              {noneLabel !== undefined && (
                <CommandGroup>
                  <CommandItem value={NONE_VALUE} onSelect={() => select('')}>
                    <span className="text-muted-foreground">{noneLabel}</span>
                  </CommandItem>
                </CommandGroup>
              )}
              {[...groups].map(([group, groupOptions]) => (
                <CommandGroup
                  key={group}
                  heading={
                    group === '' ? undefined : (
                      <span className="tracking-[0.08em] uppercase">{group}</span>
                    )
                  }
                >
                  {groupOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.hint ?? ''}`}
                      onSelect={() => select(option.value)}
                    >
                      <span className="truncate">{option.label}</span>
                      {option.hint !== undefined && (
                        <span className="text-muted-foreground ml-auto shrink-0 pl-2 text-[11px]">
                          {option.hint}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
ComboboxField.displayName = 'ComboboxField';
