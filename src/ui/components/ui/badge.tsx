import * as React from 'react';

import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '@/ui/utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[11px] transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-border-strong bg-transparent text-muted-foreground',
        secondary:
          'border-border-strong bg-muted text-muted-foreground',
        destructive:
          'border-negative/40 bg-transparent text-negative',
        outline: 'border-border-strong bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
