import * as React from 'react';

import { Label } from '@/ui/components/ui/label';
import { cn } from '@/ui/utils/cn';

import { formControlId, useFormField, useFormItemId } from './form-context';

export interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  /** Renders the required marker (`*`) after the label text. */
  required?: boolean;
}

export const FormLabel = React.forwardRef<React.ElementRef<typeof Label>, FormLabelProps>(
  ({ className, required, children, ...props }, ref) => {
    const { fieldState } = useFormField();
    const id = useFormItemId();

    return (
      <Label
        ref={ref}
        htmlFor={formControlId(id)}
        className={cn(fieldState.error && 'text-destructive', className)}
        {...props}
      >
        {children}
        {required ? (
          <span className="text-destructive ml-0.5" aria-hidden="true">
            *
          </span>
        ) : null}
      </Label>
    );
  },
);
FormLabel.displayName = 'FormLabel';
