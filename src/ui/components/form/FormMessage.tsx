import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { formMessageId, useFormField, useFormItemId } from './form-context';

/** Renders the field's first error below the control; falls back to `children`. */
export const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { fieldState } = useFormField();
  const id = useFormItemId();
  const body = fieldState.error ? String(fieldState.error.message ?? '') : children;

  if (!body) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId(id)}
      className={cn('text-destructive text-sm font-medium', className)}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';
