import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AccountCategory, CurrencyType } from '../viewmodels/account.vm';
import AccountForm from './AccountForm';

const renderForm = (onSubmit = vi.fn().mockResolvedValue(undefined), isOpen = true) => {
  const onClose = vi.fn();
  render(<AccountForm isOpen={isOpen} onClose={onClose} onSubmit={onSubmit} />);
  return { onClose };
};

describe('AccountForm', () => {
  it('submits the mapped account without a typed order', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm(onSubmit);

    fireEvent.change(screen.getByLabelText(/帳戶名稱/), { target: { value: '台銀' } });
    fireEvent.click(screen.getByRole('button', { name: '建立帳戶' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: '台銀',
        category: AccountCategory.BANK,
        currency: CurrencyType.TWD,
      }),
    );
  });

  it('offers no 顯示順序 field: order belongs to drag', () => {
    renderForm();

    expect(screen.queryByLabelText(/顯示順序/)).not.toBeInTheDocument();
  });

  it('blocks submit and shows the error when the name is empty', async () => {
    const onSubmit = vi.fn();
    renderForm(onSubmit);

    fireEvent.click(screen.getByRole('button', { name: '建立帳戶' }));

    await waitFor(() => expect(screen.getByText('帳戶名稱不能為空')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    renderForm(vi.fn(), false);

    expect(screen.queryByRole('button', { name: '建立帳戶' })).not.toBeInTheDocument();
  });
});
