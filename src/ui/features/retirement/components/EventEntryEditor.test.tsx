import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EventEntryEditor } from './EventEntryEditor';

const { confirmMock, showToastMock } = vi.hoisted(() => ({
  confirmMock: vi.fn(),
  showToastMock: vi.fn(),
}));

vi.mock('@/ui/components/confirm/useConfirm', () => ({
  useConfirm: () => ({ confirm: confirmMock }),
}));
vi.mock('@/ui/components/Toast', () => ({ showToast: showToastMock }));

function openEditor(onSave = vi.fn().mockResolvedValue(undefined)) {
  render(<EventEntryEditor currentYear={2026} onSave={onSave} />);
  fireEvent.click(screen.getByRole('button', { name: '新增事件' }));
  return { onSave };
}

describe('EventEntryEditor', () => {
  it('moves focus into the event name field on open', async () => {
    openEditor();
    await waitFor(() => expect(screen.getByLabelText(/事件名稱/)).toHaveFocus());
  });

  it('adds and removes phases through a named, keyboard-reachable control', async () => {
    openEditor();

    expect(screen.getAllByLabelText(/階段名稱/)).toHaveLength(1);
    expect(screen.getByRole('button', { name: '移除階段' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '新增階段' }));
    await waitFor(() => expect(screen.getAllByLabelText(/階段名稱/)).toHaveLength(2));

    fireEvent.click(screen.getAllByRole('button', { name: '移除階段' })[0]!);
    await waitFor(() => expect(screen.getAllByLabelText(/階段名稱/)).toHaveLength(1));
  });

  it('saves the event with its phases and shows a success toast', async () => {
    const { onSave } = openEditor();

    fireEvent.change(screen.getByLabelText(/事件名稱/), { target: { value: '購屋頭期款' } });
    fireEvent.change(screen.getByLabelText(/^金額/), { target: { value: '500000' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0]).toEqual({
      name: '購屋頭期款',
      type: 'expense',
      phases: [{ name: '', startYear: 2026, endYear: 2026, amount: 500000 }],
    });
    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith('EVENT SAVED'));
  });

  it('blocks closing with unsaved changes until confirmed', async () => {
    confirmMock.mockResolvedValue(false);
    openEditor();

    fireEvent.change(screen.getByLabelText(/事件名稱/), { target: { value: '購屋' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(confirmMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
