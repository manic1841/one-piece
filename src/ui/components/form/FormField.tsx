import * as React from 'react';

import { useController, useFormContext } from 'react-hook-form';

import { FormFieldContext } from './form-context';

export interface FormFieldProps {
  name: string;
  children: React.ReactNode;
}

/**
 * Establishes the RHF binding for one field and publishes it to the glue.
 *
 * `control` comes from `<Form {...form}>` (FormProvider); the field hook lives
 * here, not in the input, so inputs stay RHF-free.
 */
export const FormField: React.FC<FormFieldProps> = ({ name, children }) => {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });

  const value = React.useMemo(() => ({ name, field, fieldState }), [name, field, fieldState]);

  return <FormFieldContext.Provider value={value}>{children}</FormFieldContext.Provider>;
};
