import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import EventDialog from './EventDialog';

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
});
