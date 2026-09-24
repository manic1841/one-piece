import * as React from 'react';

import type { ControllerFieldState, ControllerRenderProps, FieldValues } from 'react-hook-form';

/**
 * RHF glue contexts for the form suite.
 *
 * These are the **only** place the suite's components read react-hook-form
 * state. Field components (`TextInput`, `NumberInput`, …) never touch this —
 * they receive plain props from `FormControl` (see ADR-0065).
 */

export interface FormFieldContextValue {
  name: string;
  field: ControllerRenderProps<FieldValues, string>;
  fieldState: ControllerFieldState;
}

export const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

export interface FormItemContextValue {
  id: string;
}

export const FormItemContext = React.createContext<FormItemContextValue | null>(null);

export const formControlId = (id: string) => `${id}-control`;
export const formDescriptionId = (id: string) => `${id}-description`;
export const formMessageId = (id: string) => `${id}-message`;

export const useFormField = (): FormFieldContextValue => {
  const context = React.useContext(FormFieldContext);
  if (!context) {
    throw new Error('useFormField must be used within <FormField>');
  }
  return context;
};

export const useFormItemId = (): string => {
  const context = React.useContext(FormItemContext);
  if (!context) {
    throw new Error('useFormItemId must be used within <FormItem>');
  }
  return context.id;
};
