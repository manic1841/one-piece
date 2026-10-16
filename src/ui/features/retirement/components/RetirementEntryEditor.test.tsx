import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type RetirementExpenseCategory } from '@/domains/retirement/types';

import { ExpenseEntryEditor } from './ExpenseEntryEditor';
import { IncomeEntryEditor } from './IncomeEntryEditor';

const { confirmMock, showToastMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  showToastMock: vi.fn(),
}));

vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));
vi.mock('@/ui/components/Toast', () => ({ showToast: showToastMock }));

const anchor = { currentYear: 2026, birthYear: 1986, retirementAge: 60, planInflationRate: 2 };

function renderIncome(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(<IncomeEntryEditor {...anchor} onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: '新增收入' }));
  return { onSave };
}

describe('RetirementEntryEditor — income branch', () => {
  it('moves focus into the first field on open', async () => {
    renderIncome();
    await waitFor(() => expect(screen.getByLabelText(/名稱/)).toHaveFocus());
  });

  it('offers the four end-condition semantics, defaulting a salary to 退休時結束', () => {
    renderIncome();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));

    expect(screen.getByLabelText('結束條件')).toHaveTextContent('退休時結束');
    expect(screen.queryByLabelText(/退休後/)).not.toBeInTheDocument();
  });

  it('blocks closing with unsaved changes until confirmed', async () => {
    confirmMock.mockResolvedValue(false);
    renderIncome();

    fireEvent.change(screen.getByLabelText(/名稱/), { target: { value: 'Bonus' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('saves and shows a success toast', async () => {
    const { onSave } = renderIncome();
    fireEvent.change(screen.getByLabelText(/名稱/), { target: { value: 'Bonus' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith('INCOME SAVED'));
  });
});

describe('RetirementEntryEditor — debt branch', () => {
  function renderDebt() {
    const expense: RetirementExpenseCategory = {
      id: 'expense-1',
      name: 'Mortgage',
      type: 'debt_payment',
      sourceDebtAccountId: 'debt-1',
      includesPrincipal: true,
      interestOnly: false,
      currentAnnual: 240000,
      retirementMultiplier: 1,
      startYear: 2026,
      endYear: 2035,
    };
    render(
      <ExpenseEntryEditor
        {...anchor}
        initialData={expense}
        onSave={vi.fn().mockResolvedValue(undefined)}
        trigger={<button type="button">edit</button>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
  }

  it('hides the end-condition control and shows a read-only imported end year', () => {
    renderDebt();
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));

    expect(screen.queryByLabelText('結束條件')).not.toBeInTheDocument();
    expect(screen.getByText('結束年度（由匯入決定）')).toBeInTheDocument();
    expect(screen.getByText('2035')).toBeInTheDocument();
  });

  it('locks the imported annual', () => {
    renderDebt();
    expect(screen.getByLabelText(/目前年均/)).toHaveAttribute('readonly');
  });
});

describe('RetirementEntryEditor — expense branch', () => {
  function renderGeneralExpense() {
    const expense: RetirementExpenseCategory = {
      id: 'expense-2',
      name: 'Groceries',
      type: 'general',
      includesPrincipal: false,
      interestOnly: false,
      currentAnnual: 120000,
      retirementMultiplier: 1,
      startYear: 2026,
      endYear: null,
    };
    render(
      <ExpenseEntryEditor
        {...anchor}
        initialData={expense}
        onSave={vi.fn().mockResolvedValue(undefined)}
        trigger={<button type="button">edit</button>}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'edit' }));
  }

  it('shows the import-derived annual read-only, not as an input (spec §4.1/§4.2)', () => {
    renderGeneralExpense();
    const annual = screen.getByLabelText(/目前年均/);
    expect(annual).toHaveAttribute('readonly');
    expect(annual).toHaveValue(120000);
  });
});
