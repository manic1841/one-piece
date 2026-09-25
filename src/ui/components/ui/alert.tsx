import * as React from 'react';

import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '@/ui/utils/cn';

const alertVariants = cva(
  'relative flex w-full items-center gap-4 rounded border p-3 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'border-border bg-transparent text-foreground',
        destructive: 'border-negative/40 text-negative [&>svg]:text-negative',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription };
