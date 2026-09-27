import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getIntentTypeLabel } from '@/ui/constants/transaction';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { type TransactionFormOutput } from '@/ui/features/transaction/types/transaction';

import { TransactionForm } from './TransactionForm';

// The Radix checkbox measures itself, so jsdom needs the observer.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const projects = [
  { id: 'project-1', name: '旅遊' },
  { id: 'project-2', name: '教育' },
];

const expenseCategories = [{ value: 'FOOD', label: '餐飲' }];
const incomeCategories = [{ value: 'OTHER_INCOME', label: '其他收入' }];
const investmentCategories = [{ value: 'REAL_ESTATE_BUY', label: '購置不動產' }];
const financingCategories = [{ value: 'OTHER_FINANCING', label: '其他融資' }];

const ledgerCode = (
  code: string,
  label: string,
  type: string,
  isCustom = false,
): LedgerCodeItem => ({ code, label, type, isCustom, isActive: true });

const allActiveLedgerCodes: LedgerCodeItem[] = [
  ledgerCode('expense:food', '餐飲', 'expense'),
  ledgerCode('income:other', '其他收入', 'income'),
  ledgerCode('asset:property', '不動產', 'asset'),
];

const today = () => new Date().toISOString().slice(0, 10);

function renderForm(overrides: Partial<React.ComponentProps<typeof TransactionForm>> = {}) {
  const onSubmit = overrides.onSubmit ?? vi.fn();

  render(
    <TransactionForm
      isOpen
      onClose={vi.fn()}
      onSubmit={onSubmit}
      projects={projects}
      expenseCategories={expenseCategories}
      incomeCategories={incomeCategories}
      investmentCategories={investmentCategories}
      financingCategories={financingCategories}
      advancedCategories={[...expenseCategories, ...incomeCategories]}
      allActiveLedgerCodes={allActiveLedgerCodes}
      {...overrides}
    />,
  );

  return { onSubmit };
}

const submitButton = () => screen.getByRole('button', { name: /送出|更新交易/ });
const amountInput = () => screen.getByLabelText(/^金額/) as HTMLInputElement;

/** Radix tabs activate on mousedown, not click. */
const openTab = (label: string) => fireEvent.mouseDown(screen.getByRole('tab', { name: label }));

describe('TransactionForm', () => {
  it('submits the expense tab values as a numeric payload', async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(amountInput(), { target: { value: '1200' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual<TransactionFormOutput>({
      intentType: 'EXPENSE',
      intent: undefined,
      date: today(),
      amount: 1200,
      projectId: undefined,
      ledgerCode: undefined,
      description: undefined,
      triggerAllocation: false,
      allocationItems: undefined,
      allocationDirection: undefined,
    });
  });

  it('keeps submit disabled until the active tab produces a preview', async () => {
    renderForm();

    expect(submitButton()).toBeDisabled();

    fireEvent.change(amountInput(), { target: { value: '1200' } });

    await waitFor(() => expect(submitButton()).not.toBeDisabled());
  });

  it('keeps each tab in its own form', async () => {
    renderForm();

    fireEvent.change(amountInput(), { target: { value: '1200' } });

    openTab(getIntentTypeLabel('INCOME'));
    // The income tab owns a fresh form, so the expense amount does not leak in.
    expect(amountInput()).toHaveValue(null);

    fireEvent.change(amountInput(), { target: { value: '500' } });

    openTab(getIntentTypeLabel('EXPENSE'));
    expect(amountInput()).toHaveValue(1200);
  });

  it('hydrates an edited transaction into its own tab', () => {
    renderForm({
      mode: 'edit',
      initialOutput: {
        intentType: 'INCOME',
        intent: 'OTHER_INCOME',
        date: '2026-02-01',
        amount: 10000,
        ledgerCode: 'income:other',
        description: 'February salary',
      },
    });

    expect(screen.getByRole('tab', { name: getIntentTypeLabel('INCOME') })).toHaveAttribute(
      'data-state',
      'active',
    );
    expect(amountInput()).toHaveValue(10000);
    expect(screen.getByLabelText(/^說明/)).toHaveValue('February salary');

    // A transaction edits through exactly one panel, so the others stay blank.
    openTab(getIntentTypeLabel('EXPENSE'));
    expect(amountInput()).toHaveValue(null);
  });

  it('pulls the saved income allocation template into the draft and submits it', async () => {
    const loadIncomeAllocationTemplate = vi
      .fn()
      .mockResolvedValue([{ projectId: 'project-1', percentage: 100 }]);

    const { onSubmit } = renderForm({
      mode: 'edit',
      initialOutput: {
        intentType: 'INCOME',
        intent: 'OTHER_INCOME',
        date: '2026-02-01',
        amount: 10000,
        ledgerCode: 'income:other',
      },
      loadIncomeAllocationTemplate,
    });

    await waitFor(() => expect(screen.getByTestId('allocation-row-project-1')).toBeInTheDocument());

    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      intentType: 'INCOME',
      amount: 10000,
      triggerAllocation: true,
      allocationItems: [{ projectId: 'project-1', percentage: 100 }],
      allocationDirection: 'INCOME',
    });
  });

  it('requires a ledger code before the advanced tab can submit', async () => {
    renderForm();

    openTab('進階');
    fireEvent.change(amountInput(), { target: { value: '500' } });

    await waitFor(() => expect(submitButton()).toBeDisabled());
    expect(screen.getByLabelText(/^科目/)).toBeInTheDocument();
  });

  it('submits a manual entry carried into the advanced tab', async () => {
    const { onSubmit } = renderForm({
      mode: 'edit',
      initialOutput: {
        intentType: 'MANUAL',
        date: '2026-02-01',
        amount: 500,
        ledgerCode: 'asset:property',
      },
    });

    expect(screen.getByRole('tab', { name: '進階' })).toHaveAttribute('data-state', 'active');

    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      intentType: 'MANUAL',
      amount: 500,
      ledgerCode: 'asset:property',
    });
  });
});
