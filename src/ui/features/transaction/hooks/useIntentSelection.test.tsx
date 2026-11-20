import { type ReactNode } from 'react';

import { act, renderHook } from '@testing-library/react';
import { useForm, useFormContext } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { Form } from '@/ui/components/form';

import { useIntentSelection } from './useIntentSelection';

type Values = { intent?: string; ledgerCode?: string };

/** The hook drives the surrounding RHF instance; both are read from one render. */
const renderSelection = (defaultValues: Values) => {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    const form = useForm<Values>({ defaultValues });
    return <Form {...form}>{children}</Form>;
  };

  return renderHook(() => ({ select: useIntentSelection(), form: useFormContext<Values>() }), {
    wrapper: Wrapper,
  });
};

describe('useIntentSelection', () => {
  it('clears the detail code when the category actually changes', () => {
    const { result } = renderSelection({ intent: 'LIVING', ledgerCode: 'expense:living' });

    act(() => result.current.select('HOUSING'));

    expect(result.current.form.getValues('ledgerCode')).toBe('');
    expect(result.current.form.getValues('intent')).toBe('HOUSING');
  });

  it('keeps the detail code when the same category is re-confirmed', () => {
    const { result } = renderSelection({ intent: 'LIVING', ledgerCode: 'expense:living' });

    act(() => result.current.select('LIVING'));

    expect(result.current.form.getValues('ledgerCode')).toBe('expense:living');
  });
});
