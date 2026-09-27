import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type RetirementExpenseCategory } from '@/domains/retirement/types';

import ExpenseDialog from './ExpenseDialog';

function expenseFixture(
  overrides: Partial<RetirementExpenseCategory> = {},
): RetirementExpenseCategory {
  return {
    id: 'expense-1',
    name: 'Groceries',
    type: 'general',
    includesPrincipal: false,
    interestOnly: false,
    currentAnnual: 120000,
    retirementMultiplier: 0.7,
    startYear: 2026,
    endYear: null,
    ...overrides,
  };
}

interface OpenOptions {
  initialData?: RetirementExpenseCategory;
  planInflationRate?: number;
  onSave?: (expense: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
}

function openExpenseDialog({ initialData, planInflationRate, onSave }: OpenOptions = {}) {
  render(
    <ExpenseDialog
      currentYear={2026}
      planInflationRate={planInflationRate}
      onSave={onSave ?? vi.fn().mockResolvedValue(undefined)}
      initialData={initialData}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /add expense/i }));
}

function submitDialog() {
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add expense/i }));
}

describe('ExpenseDialog', () => {
  it('shows Lifelong duration and saves an unset end year anchored at the current year', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    openExpenseDialog({ onSave });

    expect(screen.getByText('Lifelong')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('2100')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Groceries' } });
    fireEvent.change(screen.getByLabelText(/current annual/i), { target: { value: '48000' } });
    submitDialog();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: 'Groceries',
        currentAnnual: 48000,
        startYear: 2026,
        endYear: null,
      }),
    );
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('growthRate');
  });

  it('shows Until {endYear} for a category with an end year', () => {
    openExpenseDialog({ initialData: expenseFixture({ endYear: 2045 }) });

    expect(screen.getByText('Until 2045')).toBeInTheDocument();
  });

  it('shows plan inflation as the growth default and keeps explicit 0 on save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    openExpenseDialog({ onSave, planInflationRate: 2.5 });

    expect(screen.getByText('Using plan inflation: 2.5%')).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).queryByLabelText(/growth rate/i),
    ).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Advanced' }));
    fireEvent.change(screen.getByLabelText(/growth rate/i), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Groceries' } });
    fireEvent.change(screen.getByLabelText(/current annual/i), { target: { value: '48000' } });
    submitDialog();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: 'Groceries', growthRate: 0 }),
    );
  });

  it('saves an explicit growth rate from the Advanced input', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    openExpenseDialog({ onSave, planInflationRate: 2.5 });

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Advanced' }));
    fireEvent.change(screen.getByLabelText(/growth rate/i), { target: { value: '3.5' } });
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Groceries' } });
    fireEvent.change(screen.getByLabelText(/current annual/i), { target: { value: '48000' } });
    submitDialog();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: 'Groceries', growthRate: 3.5 }),
    );
  });

  it('keeps debt-payment Current Annual readonly with its End Year visible', () => {
    openExpenseDialog({
      initialData: expenseFixture({
        type: 'debt_payment',
        sourceDebtAccountId: 'debt-1',
        endYear: 2030,
      }),
    });

    const dialog = screen.getByRole('dialog');
    expect(screen.getByLabelText(/current annual/i)).toHaveAttribute('readonly');
    expect(screen.getByText(/system-derived/i)).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/^End Year/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Advanced' })).toBeInTheDocument();
  });

  it('prefills current annual and duration when editing an existing category', () => {
    openExpenseDialog({ initialData: expenseFixture({ currentAnnual: 96000, endYear: 2045 }) });

    expect(screen.getByLabelText(/current annual/i)).toHaveValue(96000);
    expect(screen.getByText('Until 2045')).toBeInTheDocument();
  });

  it('derives the retirement-year preview from the form values', () => {
    openExpenseDialog();

    expect(screen.getByText(/退休第一年支出約 0 \/yr/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/current annual/i), { target: { value: '48000' } });

    expect(screen.getByText(/退休第一年支出約 33[,.]600 \/yr/)).toBeInTheDocument();
  });

  it('blocks saving a debt-payment category without an end year', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    openExpenseDialog({
      onSave,
      initialData: expenseFixture({ type: 'debt_payment', sourceDebtAccountId: 'debt-1' }),
    });

    fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /save changes/i }),
    );

    expect(await screen.findByText('請輸入結束年度')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});
