import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import EventDialog from './EventDialog';

function openEventDialog(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(<EventDialog currentYear={2026} onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: /add event/i }));
  return within(screen.getByRole('dialog'));
}

describe('EventDialog', () => {
  it('keeps focus on phase name input while typing', async () => {
    render(<EventDialog currentYear={2026} onSave={vi.fn().mockResolvedValue(undefined)} />);

    fireEvent.click(screen.getByRole('button', { name: /add event/i }));

    const phaseNameInput = screen.getByPlaceholderText('Phase name');
    phaseNameInput.focus();

    expect(document.activeElement).toBe(phaseNameInput);

    fireEvent.change(phaseNameInput, { target: { value: 'K' } });

    expect(screen.getByDisplayValue('K')).toBe(phaseNameInput);
    expect(document.activeElement).toBe(phaseNameInput);
  });

  it('saves the event with its phase values', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const dialog = openEventDialog(onSave);

    fireEvent.change(dialog.getByLabelText(/^Event Name/), { target: { value: 'Down payment' } });
    fireEvent.change(dialog.getByLabelText(/^Amount/), { target: { value: '500000' } });
    fireEvent.click(dialog.getByRole('button', { name: /add event/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: 'Down payment',
        type: 'expense',
        phases: [
          expect.objectContaining({
            name: 'Phase 1',
            startYear: 2026,
            endYear: 2026,
            amount: 500000,
          }),
        ],
      }),
    );
  });

  it('adds and removes phases through the repeater', async () => {
    const dialog = openEventDialog();

    expect(dialog.getAllByPlaceholderText('Phase name')).toHaveLength(1);
    expect(dialog.getByRole('button', { name: 'Remove phase' })).toBeDisabled();

    fireEvent.click(dialog.getByRole('button', { name: /add phase/i }));
    await waitFor(() => expect(dialog.getAllByPlaceholderText('Phase name')).toHaveLength(2));
    const removeButtons = dialog.getAllByRole('button', { name: 'Remove phase' });
    expect(removeButtons).toHaveLength(2);
    expect(removeButtons[0]).toBeEnabled();

    fireEvent.click(removeButtons[0]);
    await waitFor(() => expect(dialog.getAllByPlaceholderText('Phase name')).toHaveLength(1));
  });
});
