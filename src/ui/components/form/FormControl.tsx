import * as React from 'react';

import {
  formControlId,
  formDescriptionId,
  formMessageId,
  useFormField,
  useFormItemId,
} from './form-context';

export interface FormControlProps {
  children: React.ReactElement;
}

/**
 * The RHF glue: reads the field binding and injects it into an RHF-free input
 * via `cloneElement`. Inputs receive `value`/`onChange`/`onBlur`/`ref` plus the
 * a11y attributes; they never import react-hook-form (see ADR-0065).
 *
 * Injection contract (also recorded in `docs/ui/design-system.md` §7):
 * `id / name / value / onChange / onBlur / ref / error / aria-invalid /
 * aria-describedby`.
 */
export const FormControl = ({ children }: FormControlProps) => {
  const { field, fieldState, name } = useFormField();
  const id = useFormItemId();
  const error = !!fieldState.error;

  const describedBy =
    [formDescriptionId(id), error ? formMessageId(id) : null].filter(Boolean).join(' ') ||
    undefined;

  return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
    id: formControlId(id),
    name,
    value: field.value ?? '',
    onChange: field.onChange,
    onBlur: field.onBlur,
    ref: field.ref,
    error,
    'aria-invalid': error,
    'aria-describedby': describedBy,
  });
};
