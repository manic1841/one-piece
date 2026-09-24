import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import AccountForm from './AccountForm';
import { AccountCategory, CurrencyType } from '../viewmodels/account.vm';

describe('AccountForm', () => {
  it('submits mapped domain data through the form suite fields', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AccountForm onSubmit={onSubmit} onCancel={() => {}} />);

    fireEvent.change(screen.getByLabelText(/帳戶名稱/), { target: { value: '台銀' } });
    fireEvent.click(screen.getByRole('button', { name: '建立帳戶' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: '台銀',
        category: AccountCategory.BANK,
        currency: CurrencyType.TWD,
        order: 0,
      }),
    );
  });

  it('blocks submit and shows the error when the name is empty', async () => {
    const onSubmit = vi.fn();
    render(<AccountForm onSubmit={onSubmit} onCancel={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '建立帳戶' }));

    await waitFor(() => expect(screen.getByText('帳戶名稱不能為空')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
