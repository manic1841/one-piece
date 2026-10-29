import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useNameField } from './useNameField';

/**
 * `formState` only re-renders when it is read during render, so the harness reads
 * it here instead of letting the test poke at the proxy afterwards.
 */
const setup = () =>
  renderHook(() => {
    const field = useNameField();
    return { ...field, errors: field.field.formState.errors };
  });

describe('useNameField', () => {
  it('opens prefilled and closes back to an empty field', () => {
    const { result } = setup();

    act(() => result.current.open('Retire early'));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.field.getValues('name')).toBe('Retire early');

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.field.getValues('name')).toBe('');
  });

  it('hands a trimmed name to the write', async () => {
    const { result } = setup();
    const save = vi.fn().mockResolvedValue({ ok: true });

    act(() =>
      result.current.field.reset({
        name: '  Retire early  ',
      }),
    );
    await act(() => result.current.submit(save));

    expect(save).toHaveBeenCalledWith('Retire early');
  });

  it('blocks a blank name without calling the write', async () => {
    const { result } = setup();
    const save = vi.fn().mockResolvedValue({ ok: true });

    await act(() => result.current.submit(save));

    expect(save).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.errors.name?.message).toBe('Name is required.'));
  });

  it('keeps failure messages in the form root and skips the success callback', async () => {
    const { result } = setup();
    const onSuccess = vi.fn();
    const save = vi.fn().mockResolvedValue({ ok: false, messages: ['Could not save.'] });

    act(() => result.current.field.reset({ name: 'Retire early' }));
    await act(() => result.current.submit(save, onSuccess));

    expect(onSuccess).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.errors.root?.message).toBe('Could not save.'));
  });

  it('runs the success callback only when the write succeeds', async () => {
    const { result } = setup();
    const onSuccess = vi.fn();

    act(() => result.current.field.reset({ name: 'Retire early' }));
    await act(() => result.current.submit(vi.fn().mockResolvedValue({ ok: true }), onSuccess));

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
