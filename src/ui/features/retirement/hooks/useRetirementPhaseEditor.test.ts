import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRetirementPhaseEditor } from './useRetirementPhaseEditor';

vi.mock('@/ui/components/Toast', () => ({ showToast: vi.fn() }));

function renderEditor(initialData?: {
  name: string;
  startYear: number;
  endYear: number;
  amount: number;
}) {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() =>
    useRetirementPhaseEditor({ currentYear: 2026, initialData, onSave }),
  );
  return { ...hook, onSave };
}

const submit = (handleSubmit: (event: React.FormEvent) => void) =>
  act(() => handleSubmit({ preventDefault: () => undefined } as unknown as React.FormEvent));

describe('useRetirementPhaseEditor', () => {
  it('defaults a new phase to the current year', () => {
    const { result } = renderEditor();
    act(() => result.current.setOpen(true));

    expect(result.current.form.getValues('startYear')).toBe('2026');
    expect(result.current.form.getValues('endYear')).toBe('2026');
    expect(result.current.form.getValues('name')).toBe('');
  });

  it('saves a blank-named phase through the schema gate and the mapper', async () => {
    const { result, onSave } = renderEditor();
    act(() => result.current.setOpen(true));
    act(() => result.current.form.setValue('amount', '10000'));

    submit(result.current.handleSubmit);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual({
      name: '',
      startYear: 2026,
      endYear: 2026,
      amount: 10000,
    });
  });

  it('seeds an existing phase for editing', () => {
    const { result } = renderEditor({
      name: 'Kindergarten',
      startYear: 2025,
      endYear: 2027,
      amount: 80000,
    });

    expect(result.current.form.getValues('name')).toBe('Kindergarten');
    expect(result.current.form.getValues('startYear')).toBe('2025');
    expect(result.current.form.getValues('amount')).toBe('80000');
  });
});
