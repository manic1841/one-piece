import * as React from 'react';

import { cn } from '@/ui/utils/cn';

import { FormItemContext } from './form-context';

/**
 * Groups one field. This is the single place label / control / error vertical
 * layout is decided — fields must not space themselves.
 */
export const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    const value = React.useMemo(() => ({ id }), [id]);

    return (
      <FormItemContext.Provider value={value}>
        <div ref={ref} className={cn('space-y-2', className)} {...props} />
      </FormItemContext.Provider>
    );
  },
);
FormItem.displayName = 'FormItem';
