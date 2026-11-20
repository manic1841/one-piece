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

const expenseCategoryOptions = [
  { value: 'FOOD', label: '餐飲' },
  { value: 'OTHER_EXPENSE', label: '其他支出' },
];
const incomeCategories = [{ value: 'OTHER_INCOME', label: '其他收入' }];

const ledgerCode = (
  code: string,
  label: string,
  type: string,
  isCustom = false,
): LedgerCodeItem => ({ code, label, type, isCustom, isActive: true });

const allActiveLedgerCodes: LedgerCodeItem[] = [
  ledgerCode('expense:food', '餐飲', 'expense'),
  ledgerCode('expense:other', '其他支出', 'expense'),
  ledgerCode('expense:pets', '毛孩開銷', 'expense', true),
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
      expenseCategoryOptions={expenseCategoryOptions}
      incomeCategories={incomeCategories}
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

/** Project selection lives behind the edit mode of the project widget. */
const openProjectEditor = () => fireEvent.click(screen.getByTestId('project-mode-toggle'));

describe('TransactionForm', () => {
  it('submits the expense tab values as a numeric payload', async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(amountInput(), { target: { value: '1200' } });
    fireEvent.click(screen.getByRole('button', { name: '餐飲' }));
    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual<TransactionFormOutput>({
      intentType: 'EXPENSE',
      intent: 'FOOD',
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

  it('keeps submit disabled until amount and category are both chosen', async () => {
    renderForm();

    expect(submitButton()).toBeDisabled();

    fireEvent.change(amountInput(), { target: { value: '1200' } });
    await waitFor(() => expect(submitButton()).toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: '餐飲' }));
    await waitFor(() => expect(submitButton()).not.toBeDisabled());
  });

  it('drops the detail code when the category changes', async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(amountInput(), { target: { value: '1200' } });
    fireEvent.click(screen.getByTestId('expense-more-toggle'));
    fireEvent.click(screen.getByRole('button', { name: '其他支出' }));

    const trigger = screen.getByRole('combobox', { name: /^詳細類別/ });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole('option', { name: '毛孩開銷' }));
    await waitFor(() => expect(submitButton()).not.toBeDisabled());

    fireEvent.click(screen.getByRole('button', { name: '餐飲' }));
    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ intent: 'FOOD', ledgerCode: undefined });
  });

  it('submits a project split derived from the selected projects', async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(amountInput(), { target: { value: '1200' } });
    fireEvent.click(screen.getByRole('button', { name: '餐飲' }));

    openProjectEditor();
    fireEvent.click(screen.getByRole('button', { name: '旅遊' }));
    fireEvent.click(screen.getByRole('button', { name: '教育' }));

    await waitFor(() => expect(submitButton()).not.toBeDisabled());
    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      intentType: 'EXPENSE',
      projectId: undefined,
      triggerAllocation: true,
      allocationItems: [
        { projectId: 'project-1', percentage: 50 },
        { projectId: 'project-2', percentage: 50 },
      ],
      allocationDirection: 'EXPENSE',
    });
  });

  it('keeps a single project as a direct link instead of a split', async () => {
    const { onSubmit } = renderForm();

    fireEvent.change(amountInput(), { target: { value: '1200' } });
    fireEvent.click(screen.getByRole('button', { name: '餐飲' }));

    openProjectEditor();
    fireEvent.click(screen.getByRole('button', { name: '旅遊' }));

    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      projectId: 'project-1',
      triggerAllocation: false,
    });
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

  it('folds a one-project income template into a direct project link', async () => {
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

    await waitFor(() =>
      expect(screen.getByRole('list', { name: '專案分配' })).toHaveTextContent('旅遊100%'),
    );

    fireEvent.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      intentType: 'INCOME',
      amount: 10000,
      projectId: 'project-1',
      triggerAllocation: false,
    });
    expect(onSubmit.mock.calls[0]?.[0].allocationItems).toBeUndefined();
  });

  it('does not reapply the template over a split the user edited', async () => {
    const loadIncomeAllocationTemplate = vi
      .fn()
      .mockResolvedValue([{ projectId: 'project-1', percentage: 100 }]);

    renderForm({
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

    await waitFor(() =>
      expect(screen.getByRole('list', { name: '專案分配' })).toHaveTextContent('旅遊100%'),
    );

    openProjectEditor();
    fireEvent.click(screen.getByRole('button', { name: '教育' }));
    await waitFor(() =>
      expect(screen.getByRole('list', { name: '專案分配' })).toHaveTextContent('旅遊50%教育50%'),
    );

    // Leaving and re-entering the tab must keep the edited split, not the template.
    openTab(getIntentTypeLabel('EXPENSE'));
    openTab(getIntentTypeLabel('INCOME'));

    expect(screen.getByRole('list', { name: '專案分配' })).toHaveTextContent('旅遊50%教育50%');
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

describe('TransactionForm reopening', () => {
  // The dialog stays mounted while closed so Radix can animate the exit, which
  // means the draft has to be rebuilt by the open edge rather than by a remount.
  it('rebuilds the draft from the new opening instead of keeping the last one', () => {
    const props = {
      onClose: vi.fn(),
      onSubmit: vi.fn(),
      projects,
      expenseCategoryOptions,
      incomeCategories,
      allActiveLedgerCodes,
    };

    const { rerender } = render(<TransactionForm isOpen {...props} />);
    fireEvent.change(amountInput(), { target: { value: '1200' } });

    rerender(<TransactionForm isOpen={false} {...props} />);
    rerender(
      <TransactionForm
        isOpen
        {...props}
        mode="edit"
        initialOutput={{
          intentType: 'INCOME',
          intent: 'OTHER_INCOME',
          date: '2026-02-01',
          amount: 500,
          ledgerCode: 'income:other',
        }}
      />,
    );

    expect(screen.getByRole('tab', { name: getIntentTypeLabel('INCOME') })).toHaveAttribute(
      'data-state',
      'active',
    );
    expect(amountInput()).toHaveValue(500);
  });
});
