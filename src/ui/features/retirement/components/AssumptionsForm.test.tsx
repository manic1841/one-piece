import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AssumptionsForm from './AssumptionsForm';

const assumptions = {
  currentYear: 2026,
  birthYear: 1990,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 2,
  investmentReturnRate: 5,
};

describe('AssumptionsForm', () => {
  it('shows the read-only summary until Edit is clicked', () => {
    render(<AssumptionsForm assumptions={assumptions} onSave={vi.fn()} />);

    expect(screen.getByText('Basic Assumptions')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Inflation Rate/)).not.toBeInTheDocument();
  });

  it('saves the coerced values and returns to the summary', async () => {
    const onSave = vi.fn();
    render(<AssumptionsForm assumptions={assumptions} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/^Inflation Rate/), { target: { value: '2.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ currentYear: 2026, inflationRate: 2.5 }),
    );
    expect(screen.getByText('Basic Assumptions')).toBeInTheDocument();
  });

  it('cancels back to the summary without saving', () => {
    const onSave = vi.fn();
    render(<AssumptionsForm assumptions={assumptions} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/^Inflation Rate/), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Basic Assumptions')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
