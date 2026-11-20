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

  // The child may carry its own handler (a row-level `update`, a method switch),
  // so keep it and still let RHF record the raw value.
  const child = children as React.ReactElement<Record<string, unknown>>;
  const childOnChange = child.props.onChange as ((...args: unknown[]) => void) | undefined;
  const childOnBlur = child.props.onBlur as ((...args: unknown[]) => void) | undefined;

  return React.cloneElement(child, {
    id: formControlId(id),
    name,
    value: field.value ?? '',
    onChange: (...args: unknown[]) => {
      (field.onChange as (value: unknown) => void)(args[0]);
      childOnChange?.(...args);
    },
    onBlur: (...args: unknown[]) => {
      (field.onBlur as (value: unknown) => void)(args[0]);
      childOnBlur?.(...args);
    },
    ref: field.ref,
    // Omitted rather than `false`: a non-input child (a label wrapping a switch)
    // would render it as an invalid boolean DOM attribute otherwise.
    error: error || undefined,
    'aria-invalid': error,
    'aria-describedby': describedBy,
  });
};
