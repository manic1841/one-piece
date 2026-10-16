import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AssumptionsForm from './AssumptionsForm';

const TODAY = new Date().getFullYear();

const assumptions = {
  currentAge: 36,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 2,
  investmentReturnRate: 5,
  currentYear: 2026,
  retirementYear: 2050,
  lifeExpectancyYear: 2075,
};

const plan = {
  id: 'p1',
  householdId: 'h1',
  name: 'Plan A',
  isActive: true,
  autoUpdate: false,
  currentYear: 2026,
  birthYear: 1990,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflationRate: 0,
  investmentReturnRate: 0,
  incomes: [],
  expenses: [],
  events: [],
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

const netWorthSource = {
  startingNetWorth: 1_000_000,
  anchorYearMonth: '2025-12',
  assets: 1_200_000,
  liabilities: 200_000,
};

describe('AssumptionsForm', () => {
  it('shows a five-metric summary with derived years and no year cells', () => {
    render(
      <AssumptionsForm
        assumptions={assumptions}
        plan={plan}
        netWorthSource={netWorthSource}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText('36（2026）')).toBeInTheDocument();
    expect(screen.getByText('60（2050）')).toBeInTheDocument();
    expect(screen.getByText('85（2075）')).toBeInTheDocument();
    expect(screen.getByText('2%')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();

    expect(screen.queryByText('Current Year')).not.toBeInTheDocument();
    expect(screen.queryByText('Birth Year')).not.toBeInTheDocument();
  });

  it('expands two grouped fieldsets in place when Edit is clicked', () => {
    render(
      <AssumptionsForm
        assumptions={assumptions}
        plan={plan}
        netWorthSource={netWorthSource}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByText('人生時程')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByText('人生時程')).toBeInTheDocument();
    expect(screen.getByText('財務假設')).toBeInTheDocument();
    expect(screen.getByLabelText(/^目前年齡/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^退休年齡/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^預期壽命/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^通膨率/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^投資報酬率/)).toBeInTheDocument();
  });

  it('saves the edited assumptions and returns to the summary', async () => {
    const onSave = vi.fn();
    render(
      <AssumptionsForm
        assumptions={assumptions}
        plan={plan}
        netWorthSource={netWorthSource}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/^通膨率/), { target: { value: '2.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ inflationRate: 2.5, retirementAge: 60, lifeExpectancy: 85 }),
    );
    expect(onSave.mock.calls[0][0].currentYear).toBe(TODAY);
    expect(onSave.mock.calls[0][0].birthYear).toBe(TODAY - 36);
    expect(screen.getByText('36（2026）')).toBeInTheDocument();
  });

  it('blocks saving and shows an error when the timeline order is invalid', async () => {
    const onSave = vi.fn();
    render(
      <AssumptionsForm
        assumptions={assumptions}
        plan={plan}
        netWorthSource={netWorthSource}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/^退休年齡/), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('退休年齡必須大於目前年齡')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('cancels back to the summary without saving', () => {
    const onSave = vi.fn();
    render(
      <AssumptionsForm
        assumptions={assumptions}
        plan={plan}
        netWorthSource={netWorthSource}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText(/^通膨率/), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('36（2026）')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('hides the preview outside edit mode', () => {
    render(
      <AssumptionsForm
        assumptions={assumptions}
        plan={plan}
        netWorthSource={netWorthSource}
        onSave={vi.fn()}
      />,
    );

    expect(screen.queryByText('預覽')).not.toBeInTheDocument();
  });

  it('shows a live 最終資產 and 最低資產 preview in edit mode', () => {
    render(
      <AssumptionsForm
        assumptions={assumptions}
        plan={plan}
        netWorthSource={netWorthSource}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByText('預覽')).toBeInTheDocument();
    expect(screen.getByText('最終資產')).toBeInTheDocument();
    expect(screen.getByText('最低資產')).toBeInTheDocument();
    // Each picked figure renders its money value.
    expect(screen.getByTestId('assumption-preview-final-net-worth')).toHaveTextContent('$');
    expect(screen.getByTestId('assumption-preview-min-savings')).toHaveTextContent('$');
  });

  it('omits the preview entirely when starting net worth is unavailable', () => {
    render(
      <AssumptionsForm
        assumptions={assumptions}
        plan={plan}
        netWorthSource={{ reason: 'NO_CLOSED_PERIOD' }}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.queryByText('預覽')).not.toBeInTheDocument();
  });
});
