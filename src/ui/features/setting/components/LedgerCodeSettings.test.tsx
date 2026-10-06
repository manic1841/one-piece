import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LedgerCodeSettings } from './LedgerCodeSettings';

vi.mock('@/ui/features/setting/hooks/useLedgerCodeSettings', () => ({
  useLedgerCodeSettings: vi.fn(),
}));

const hookReturn = (overrides: Record<string, unknown> = {}) => ({
  groupedRows: { asset: [], liability: [], income: [], expense: [] },
  loading: false,
  newLabel: '',
  setNewLabel: vi.fn(),
  newCode: '',
  setNewCode: vi.fn(),
  newType: 'expense',
  setNewType: vi.fn(),
  editingCode: null,
  editValue: '',
  setEditValue: vi.fn(),
  isSubmitting: false,
  error: '',
  handleAdd: vi.fn().mockResolvedValue(true),
  handleToggleActive: vi.fn(),
  startEdit: vi.fn(),
  cancelEdit: vi.fn(),
  saveEdit: vi.fn(),
  ...overrides,
});

const mockHook = async (overrides: Record<string, unknown> = {}) => {
  const { useLedgerCodeSettings } = await import('../hooks/useLedgerCodeSettings');
  const value = hookReturn(overrides);
  vi.mocked(useLedgerCodeSettings).mockReturnValue(value as never);
  return value;
};

/** 點開新增對話框的 trigger。 */
const openAddDialog = () => fireEvent.click(screen.getByRole('button', { name: 'Add Category' }));

/** 對話框內的 submit 按鈕（trigger 與 submit 同名，須限定在 dialog 內查詢）。 */
const submitDialog = () =>
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add Category' }));

describe('LedgerCodeSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the four type groups expanded by default with their counts', async () => {
    await mockHook();

    render(<LedgerCodeSettings />);

    for (const label of [
      'Asset (資產) Categories (0)',
      'Liability (負債) Categories (0)',
      'Income (收入) Categories (0)',
      'Expense (支出) Categories (0)',
    ]) {
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-expanded', 'true');
    }
    expect(screen.getAllByText('No categories defined for this type.')).toHaveLength(4);
  });

  it('keeps the add form out of the page until the dialog is opened', async () => {
    await mockHook();

    render(<LedgerCodeSettings />);

    expect(screen.queryByPlaceholderText('property 或 property:taipei')).not.toBeInTheDocument();

    openAddDialog();

    expect(await screen.findByPlaceholderText('property 或 property:taipei')).toBeInTheDocument();
  });

  it('submits the add form through the hook and closes the dialog on success', async () => {
    const value = await mockHook();

    render(<LedgerCodeSettings />);
    openAddDialog();

    fireEvent.change(await screen.findByPlaceholderText('property 或 property:taipei'), {
      target: { value: 'travel' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 差旅費'), {
      target: { value: '差旅費' },
    });
    submitDialog();

    expect(value.setNewCode).toHaveBeenCalledWith('travel');
    expect(value.setNewLabel).toHaveBeenCalledWith('差旅費');
    expect(value.handleAdd).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the dialog open and shows the error inside it when the add fails', async () => {
    await mockHook({ handleAdd: vi.fn().mockResolvedValue(false), error: '科目代碼已存在。' });

    render(<LedgerCodeSettings />);
    openAddDialog();

    submitDialog();

    await waitFor(() => expect(screen.getByText('科目代碼已存在。')).toBeInTheDocument());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('binds custom code actions to hook handlers', async () => {
    const item = {
      code: 'expense:travel',
      label: '差旅費',
      type: 'expense',
      isCustom: true,
      isActive: true,
    };
    const value = await mockHook({
      groupedRows: { asset: [], liability: [], income: [], expense: [{ item, isDetail: false }] },
      editingCode: 'expense:travel',
      editValue: '差旅費',
      error: '更新失敗',
    });

    render(<LedgerCodeSettings />);

    fireEvent.change(screen.getByDisplayValue('差旅費'), { target: { value: '新差旅費' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(value.setEditValue).toHaveBeenCalledWith('新差旅費');
    expect(value.saveEdit).toHaveBeenCalledTimes(1);
    expect(value.cancelEdit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('更新失敗')).toBeInTheDocument();
  });

  it('toggles a custom code between active and disabled', async () => {
    const item = {
      code: 'expense:travel',
      label: '差旅費',
      type: 'expense',
      isCustom: true,
      isActive: false,
    };
    const value = await mockHook({
      groupedRows: { asset: [], liability: [], income: [], expense: [{ item, isDetail: false }] },
    });

    render(<LedgerCodeSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));

    expect(value.handleToggleActive).toHaveBeenCalledWith(item);
  });

  it('shows details indented under their parent label and never offers a delete control', async () => {
    await mockHook({
      groupedRows: {
        asset: [
          {
            item: {
              code: 'asset:property',
              label: '不動產',
              type: 'asset',
              isCustom: true,
              isActive: true,
            },
            isDetail: false,
          },
          {
            item: {
              code: 'asset:property:taipei',
              label: '台北房產',
              type: 'asset',
              isCustom: true,
              isActive: true,
            },
            isDetail: true,
            parentLabel: '不動產',
          },
        ],
        liability: [],
        income: [],
        expense: [],
      },
    });

    const { container } = render(<LedgerCodeSettings />);

    expect(screen.getByText('不動產 › 台北房產')).toBeInTheDocument();
    expect(screen.getByText('asset:property:taipei')).toBeInTheDocument();
    expect(container.querySelectorAll('.lucide-trash2')).toHaveLength(0);
  });
});
