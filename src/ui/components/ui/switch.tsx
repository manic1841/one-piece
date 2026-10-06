import * as React from 'react';

import { cn } from '@/ui/utils';

interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
}) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-strong bg-transparent p-0.5 transition-[border-color] duration-fast ease-out-quint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
      checked && 'justify-end border-primary',
      className,
    )}
  >
    <span
      className={cn(
        'pointer-events-none block h-[18px] w-[18px] rounded-full bg-muted transition-colors',
        checked && 'bg-primary',
      )}
    />
  </button>
);

Switch.displayName = 'Switch';
