import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useRetirementEventEditor } from './useRetirementEventEditor';

vi.mock('@/ui/components/Toast', () => ({ showToast: vi.fn() }));

const anchor = { currentYear: 2026 };

function renderEditor() {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useRetirementEventEditor({ ...anchor, onSave }));
  return { ...hook, onSave };
}

const submit = (handleSubmit: (event: React.FormEvent) => void) =>
  act(() => handleSubmit({ preventDefault: () => undefined } as unknown as React.FormEvent));

describe('useRetirementEventEditor', () => {
  it('adds a blank-named phase with the current year by default', () => {
    const { result } = renderEditor();
    act(() => result.current.setOpen(true));

    expect(result.current.phaseFields).toHaveLength(1);
    expect(result.current.form.getValues('phases.0.startYear')).toBe('2026');
    expect(result.current.form.getValues('phases.0.name')).toBe('');
  });

  it('saves the event through the schema gate and the domain mapper', async () => {
    const { result, onSave } = renderEditor();
    act(() => result.current.setOpen(true));
    act(() => result.current.form.setValue('name', 'Down payment'));
    act(() => result.current.form.setValue('phases.0.amount', '500000'));

    submit(result.current.handleSubmit);

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual({
      name: 'Down payment',
      type: 'expense',
      phases: [{ name: '', startYear: 2026, endYear: 2026, amount: 500000 }],
    });
  });

  it('surfaces a save failure through submitError', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useRetirementEventEditor({ ...anchor, onSave }));
    act(() => result.current.setOpen(true));
    act(() => result.current.form.setValue('name', 'Down payment'));
    act(() => result.current.form.setValue('phases.0.amount', '500000'));

    submit(result.current.handleSubmit);

    await waitFor(() => expect(result.current.submitError).toBe('boom'));
  });

  it('appends and removes phases', () => {
    const { result } = renderEditor();
    act(() => result.current.setOpen(true));

    act(() => result.current.handleAddPhase());
    expect(result.current.phaseFields).toHaveLength(2);

    act(() => result.current.handleRemovePhase(0));
    expect(result.current.phaseFields).toHaveLength(1);
  });
});
