import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LedgerCodeSettings } from './LedgerCodeSettings';

vi.mock('@/ui/features/ledger/hooks/useLedgerCodeSettings', () => ({
  useLedgerCodeSettings: vi.fn(),
}));

describe('LedgerCodeSettings', () => {
  it('submits the add form through the hook', async () => {
    const handleAdd = vi.fn().mockResolvedValue(undefined);
    const setNewType = vi.fn();
    const setNewCategory = vi.fn();
    const setNewLabel = vi.fn();
    const { useLedgerCodeSettings } = await import('../hooks/useLedgerCodeSettings');

    vi.mocked(useLedgerCodeSettings).mockReturnValue({
      groupedCodes: { asset: [], liability: [], income: [], expense: [] },
      loading: false,
      newLabel: '',
      setNewLabel,
      newCategory: '',
      setNewCategory,
      newType: 'expense',
      setNewType,
      editingCode: null,
      editValue: '',
      setEditValue: vi.fn(),
      isSubmitting: false,
      error: '',
      handleAdd,
      handleToggleActive: vi.fn(),
      startEdit: vi.fn(),
      cancelEdit: vi.fn(),
      saveEdit: vi.fn(),
    });

    const { container } = render(<LedgerCodeSettings />);

    fireEvent.change(screen.getByPlaceholderText('e.g. travel'), {
      target: { value: 'travel' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 差旅費'), {
      target: { value: '差旅費' },
    });
    fireEvent.submit(container.querySelector('form') as HTMLFormElement);

    expect(setNewCategory).toHaveBeenCalledWith('travel');
    expect(setNewLabel).toHaveBeenCalledWith('差旅費');
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('binds custom code actions to hook handlers', async () => {
    const handleToggleActive = vi.fn();
    const cancelEdit = vi.fn();
    const saveEdit = vi.fn();
    const setEditValue = vi.fn();
    const { useLedgerCodeSettings } = await import('../hooks/useLedgerCodeSettings');

    vi.mocked(useLedgerCodeSettings).mockReturnValue({
      groupedCodes: {
        asset: [],
        liability: [],
        income: [],
        expense: [
          {
            code: 'expense:travel',
            label: '差旅費',
            type: 'expense',
            isCustom: true,
            isActive: true,
          },
        ],
      },
      loading: false,
      newLabel: '',
      setNewLabel: vi.fn(),
      newCategory: '',
      setNewCategory: vi.fn(),
      newType: 'expense',
      setNewType: vi.fn(),
      editingCode: 'expense:travel',
      editValue: '差旅費',
      setEditValue,
      isSubmitting: false,
      error: '更新失敗',
      handleAdd: vi.fn(),
      handleToggleActive,
      startEdit: vi.fn(),
      cancelEdit,
      saveEdit,
    });

    render(<LedgerCodeSettings />);

    fireEvent.change(screen.getByDisplayValue('差旅費'), {
      target: { value: '新差旅費' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Active' }));

    expect(setEditValue).toHaveBeenCalledWith('新差旅費');
    expect(saveEdit).toHaveBeenCalledTimes(1);
    expect(cancelEdit).toHaveBeenCalledTimes(1);
    expect(handleToggleActive).toHaveBeenCalledWith({
      code: 'expense:travel',
      label: '差旅費',
      type: 'expense',
      isCustom: true,
      isActive: true,
    });
    expect(screen.getByText('更新失敗')).toBeTruthy();
  });
});
