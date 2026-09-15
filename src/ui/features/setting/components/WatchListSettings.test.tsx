import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import WatchListSettings from './WatchListSettings';

vi.mock('../hooks/useWatchListSettings', () => ({
  useWatchListSettings: vi.fn(),
}));

const makeTarget = (
  targetType: 'PROJECT' | 'LEDGER_CODE' | 'DEBT_ACCOUNT',
  targetId: string,
  name: string,
) => ({
  id: `${targetType}:${targetId}`,
  targetType,
  targetId,
  name,
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedBy: 'user-1',
  updatedAt: new Date(),
});

describe('WatchListSettings', () => {
  it('renders the three target type pickers with labels from constants', async () => {
    const { useWatchListSettings } = await import('../hooks/useWatchListSettings');
    vi.mocked(useWatchListSettings).mockReturnValue({
      targets: [],
      loading: false,
      saving: false,
      error: '',
      addTarget: vi.fn(),
      removeTarget: vi.fn(),
      refresh: vi.fn(),
    });

    render(<WatchListSettings />);

    expect(screen.getByText('監看清單')).toBeInTheDocument();
    expect(screen.getByText('專案')).toBeInTheDocument();
    expect(screen.getByText('會計科目')).toBeInTheDocument();
    expect(screen.getByText('債務帳戶')).toBeInTheDocument();
    expect(screen.getByText('尚未監看任何對象。')).toBeInTheDocument();
  });

  it('shows watched targets grouped with remove buttons', async () => {
    const removeTarget = vi.fn().mockResolvedValue(undefined);
    const { useWatchListSettings } = await import('../hooks/useWatchListSettings');
    vi.mocked(useWatchListSettings).mockReturnValue({
      targets: [
        makeTarget('PROJECT', 'p1', '媽媽專案'),
        makeTarget('DEBT_ACCOUNT', 'd1', '房貸'),
      ],
      loading: false,
      saving: false,
      error: '',
      addTarget: vi.fn(),
      removeTarget,
      refresh: vi.fn(),
    });

    render(<WatchListSettings />);

    expect(screen.getByText('媽媽專案')).toBeInTheDocument();
    expect(screen.getByText('房貸')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '移除 媽媽專案' })[0]);
    await waitFor(() => expect(removeTarget).toHaveBeenCalledWith('PROJECT', 'p1'));
  });

  it('adds a target through the hook from the picker selection', async () => {
    const addTarget = vi.fn().mockResolvedValue(undefined);
    const { useWatchListSettings } = await import('../hooks/useWatchListSettings');
    vi.mocked(useWatchListSettings).mockReturnValue({
      targets: [],
      loading: false,
      saving: false,
      error: '',
      addTarget,
      removeTarget: vi.fn(),
      refresh: vi.fn(),
    });

    render(
      <WatchListSettings
        pickerOptions={{
          projects: [
            { id: 'p1', name: '媽媽專案', color: 'blue', icon: '', order: 0, isActive: true },
          ],
          ledgerCodes: [],
          debtAccounts: [],
        }}
      />,
    );

    const projectSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(projectSelect, { target: { value: 'p1' } });
    fireEvent.click(screen.getAllByRole('button', { name: '加入監看' })[0]);

    await waitFor(() => expect(addTarget).toHaveBeenCalledWith('PROJECT', 'p1', '媽媽專案'));
  });

  it('surfaces hook errors instead of failing silently', async () => {
    const { useWatchListSettings } = await import('../hooks/useWatchListSettings');
    vi.mocked(useWatchListSettings).mockReturnValue({
      targets: [],
      loading: false,
      saving: false,
      error: 'Permission denied',
      addTarget: vi.fn(),
      removeTarget: vi.fn(),
      refresh: vi.fn(),
    });

    render(<WatchListSettings />);

    expect(screen.getByText('Permission denied')).toBeInTheDocument();
  });
});
