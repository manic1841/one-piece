import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type Account, type PortfolioFormVM } from '../viewmodels/portfolioForm.vm';
import PortfolioForm from './PortfolioForm';

// The Radix select measures itself through `@radix-ui/react-use-size`.
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

function renderForm({
  isOpen = true,
  onSubmit = vi.fn().mockResolvedValue(undefined),
}: {
  isOpen?: boolean;
  onSubmit?: (data: PortfolioFormVM) => Promise<void>;
} = {}) {
  const onClose = vi.fn();

  const utils = render(
    <PortfolioForm isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} accounts={accounts} />,
  );

  return { ...utils, onSubmit, onClose };
}

const submitButton = () => screen.getByRole('button', { name: 'Create Portfolio' });
const nameInput = () => screen.getByLabelText(/^Name/);

const chooseSelect = async (index: number, optionName: string) => {
  const trigger = screen.getAllByRole('combobox')[index];
  trigger.focus();
  fireEvent.click(trigger);
  fireEvent.click(await screen.findByRole('option', { name: optionName }));
};

describe('PortfolioForm', () => {
  it('submits a validated create VM', async () => {
    const { onSubmit, onClose } = renderForm();

    fireEvent.change(nameInput(), { target: { value: 'Retirement' } });
    await chooseSelect(0, 'Brokerage');
    await chooseSelect(1, 'Bank A (bank)');

    act(() => {
      fireEvent.click(submitButton());
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      name: 'Retirement',
      securitiesAccountId: 'sec-1',
      bankAccountId: 'bank-1',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('blocks the submit and marks the name when it is cleared', async () => {
    const { onSubmit, onClose } = renderForm();

    fireEvent.change(nameInput(), { target: { value: '' } });
    act(() => {
      fireEvent.click(submitButton());
    });

    await waitFor(() => expect(screen.getByText('投資組合名稱不能為空')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports the missing account links on an empty form', async () => {
    const { onSubmit } = renderForm();

    expect(nameInput()).toHaveValue('');
    expect(screen.getAllByRole('combobox')).toHaveLength(2);

    act(() => {
      fireEvent.click(submitButton());
    });

    await waitFor(() => expect(screen.getByText('請選擇證券帳戶')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('has no lifecycle checkbox (create-only)', () => {
    renderForm();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
