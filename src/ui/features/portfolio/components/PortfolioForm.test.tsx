import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Account, type PortfolioFormVM } from '../viewmodels/portfolioForm.vm';
import PortfolioForm from './PortfolioForm';

// The Radix checkbox measures itself through `@radix-ui/react-use-size`.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

const accounts = [
  { id: 'sec-1', name: 'Brokerage', category: 'securities', currency: 'TWD' },
  { id: 'bank-1', name: 'Bank A', category: 'bank', currency: 'TWD' },
  { id: 'cash-1', name: 'Petty Cash', category: 'cash', currency: 'TWD' },
  { id: 'other-1', name: 'Misc', category: 'other', currency: 'TWD' },
] as unknown as Account[];

const portfolio = {
  id: 'p1',
  name: 'Retirement',
  securitiesAccountId: 'sec-1',
  bankAccountId: 'bank-1',
  isActive: true,
  order: 3,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const otherPortfolio = { ...portfolio, id: 'p2', name: 'Education', order: 0 };

function renderForm({
  isOpen = true,
  target,
  onSubmit = vi.fn().mockResolvedValue(undefined),
}: {
  isOpen?: boolean;
  target?: typeof portfolio;
  onSubmit?: (data: PortfolioFormVM) => Promise<void>;
} = {}) {
  const onClose = vi.fn();

  const renderFormElement = (open: boolean, editTarget?: typeof portfolio) => (
    <PortfolioForm
      isOpen={open}
      onClose={onClose}
      onSubmit={onSubmit}
      accounts={accounts}
      portfolio={editTarget}
    />
  );

  const utils = render(renderFormElement(isOpen, target));

  return {
    ...utils,
    onSubmit,
    onClose,
    rerenderWith: (open: boolean, editTarget?: typeof portfolio) =>
      utils.rerender(renderFormElement(open, editTarget)),
  };
}

const submitButton = () => screen.getByRole('button', { name: /Create Portfolio|Save Changes/ });
const nameInput = () => screen.getByLabelText(/^Name/);

describe('PortfolioForm', () => {
  it('submits the edited portfolio as a validated VM', async () => {
    const { onSubmit, onClose } = renderForm({ target: portfolio });

    expect(nameInput()).toHaveValue('Retirement');

    act(() => {
      fireEvent.click(submitButton());
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: 'Retirement',
      securitiesAccountId: 'sec-1',
      bankAccountId: 'bank-1',
      isActive: true,
      order: 3,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('blocks the submit and marks the name when it is cleared', async () => {
    const { onSubmit, onClose } = renderForm({ target: portfolio });

    fireEvent.change(nameInput(), { target: { value: '' } });

    act(() => {
      fireEvent.click(submitButton());
    });

    await waitFor(() => expect(screen.getByText('投資組合名稱不能為空')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports the missing account links on an empty create form', async () => {
    const { onSubmit } = renderForm();

    expect(nameInput()).toHaveValue('');
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getAllByRole('combobox')).toHaveLength(2);

    act(() => {
      fireEvent.click(submitButton());
    });

    await waitFor(() => expect(screen.getByText('請選擇證券帳戶')).toBeInTheDocument());
    expect(screen.getByText('請選擇銀行帳戶')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('surfaces a rejected submit through the root error channel', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('儲存失敗，請稍後再試'));
    const { onClose } = renderForm({ target: portfolio, onSubmit });

    act(() => {
      fireEvent.click(submitButton());
    });

    await waitFor(() => expect(screen.getByText('儲存失敗，請稍後再試')).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('re-applies the edit target every time the dialog opens', async () => {
    const { rerenderWith } = renderForm({ target: portfolio });

    expect(nameInput()).toHaveValue('Retirement');

    await act(async () => {
      rerenderWith(false, otherPortfolio);
      rerenderWith(true, otherPortfolio);
    });

    expect(nameInput()).toHaveValue('Education');
  });
});
