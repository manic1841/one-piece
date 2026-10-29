import * as React from 'react';

import * as LabelPrimitive from '@radix-ui/react-label';
import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '@/ui/utils/cn';

const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
  {
    variants: {
      /**
       * `compact` is the field-label step for dense forms: one step under the
       * default and still above the 11px label floor, so a field label never
       * ties with a section heading (design-system §4).
       */
      size: { default: '', compact: 'text-xs' },
    },
    defaultVariants: { size: 'default' },
  },
);

const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, size, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants({ size }), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
