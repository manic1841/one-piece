import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { formDescriptionId, useFormItemId } from './form-context';

export const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const id = useFormItemId();

  return (
    <p
      ref={ref}
      id={formDescriptionId(id)}
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';
