import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type RetirementIncomeSource } from '@/domains/retirement/types';

import IncomeDialog from './IncomeDialog';

function incomeFixture(overrides: Partial<RetirementIncomeSource> = {}): RetirementIncomeSource {
  return {
    id: 'income-1',
    name: 'Salary',
    type: 'salary',
    lifelong: false,
    startYear: 2026,
    endYear: 2046,
    currentAnnual: 120000,
    growthRate: 2,
    calculatedFrom: {
      ledgerCode: 'income:salary:charles',
      sampleYear: 2025,
      totalAmount: 120000,
      monthlyAverage: 10000,
      sampleCount: 12,
      importedAt: '2026-01-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

interface OpenOptions {
  initialData?: RetirementIncomeSource;
  planInflationRate?: number;
  onSave?: (income: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
}

function openIncomeDialog({ initialData, planInflationRate, onSave }: OpenOptions = {}) {
  render(
    <IncomeDialog
      currentYear={2026}
      planInflationRate={planInflationRate}
      onSave={onSave ?? vi.fn().mockResolvedValue(undefined)}
      initialData={initialData}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /add income/i }));
}

function submitDialog() {
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', {
      name: /add income|save changes/i,
    }),
  );
}

describe('IncomeDialog v2 (issue #133)', () => {
  it('keeps Current Annual readonly and passes import provenance through on edit', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    openIncomeDialog({ initialData: incomeFixture(), onSave, planInflationRate: 2 });

    const currentAnnual = screen.getByLabelText(/current annual/i);
    expect(currentAnnual).toHaveValue(120000);
    expect(currentAnnual).toHaveAttribute('readonly');

    submitDialog();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: 'Salary',
        currentAnnual: 120000,
        calculatedFrom: expect.objectContaining({
          ledgerCode: 'income:salary:charles',
          sampleYear: 2025,
        }),
      }),
    );
  });

  it('shows an em dash Current Annual with the import hint for a scenario-only stream', () => {
    openIncomeDialog({
      initialData: incomeFixture({ currentAnnual: null, calculatedFrom: undefined }),
    });

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Import from Ledger to populate.')).toBeInTheDocument();
  });

  it('uses plan inflation as the growth default and reveals the rate in Advanced', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    openIncomeDialog({ onSave, planInflationRate: 2.5 });

    expect(screen.getByText('Using plan inflation: 2.5%')).toBeInTheDocument();
    expect(
      within(screen.getByRole('dialog')).queryByLabelText(/growth rate/i),
    ).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Advanced' }));
    fireEvent.change(screen.getByLabelText(/growth rate/i), { target: { value: '3.5' } });
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Bonus' } });
    submitDialog();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: 'Bonus', growthRate: 3.5, currentAnnual: null }),
    );
  });

  it('has no source selector, ledger code, sample year, or income auto-update switch', () => {
    openIncomeDialog({ initialData: incomeFixture() });

    expect(screen.queryByLabelText('Source')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/ledger code/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/sample year/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/auto update/i)).not.toBeInTheDocument();
  });

  it('saves an unset end year when Lifelong is enabled', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    openIncomeDialog({ onSave, planInflationRate: 2 });

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Pension' } });
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('switch', { name: 'Lifelong' }));
    submitDialog();

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: 'Pension', lifelong: true }),
    );
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('endYear');
  });
});
