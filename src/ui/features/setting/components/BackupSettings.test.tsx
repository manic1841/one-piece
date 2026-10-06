import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConfirmDialogProvider } from '@/ui/components/confirm/ConfirmDialog';

import { BackupSettings } from './BackupSettings';

const baseProps = () => ({
  backupLoading: false,
  backupError: '',
  backupSuccess: '',
  onExport: vi.fn().mockResolvedValue(undefined),
  restoreLoading: false,
  restoreError: '',
  restoreSuccess: '',
  onRestore: vi.fn().mockResolvedValue(undefined),
});

const renderSettings = (overrides: Partial<ReturnType<typeof baseProps>> = {}) => {
  const props = { ...baseProps(), ...overrides };
  const view = render(
    <ConfirmDialogProvider>
      <BackupSettings {...props} />
    </ConfirmDialogProvider>,
  );
  return { ...view, props };
};

describe('BackupSettings', () => {
  it('exports when the export button is pressed', () => {
    const { props } = renderSettings();

    fireEvent.click(screen.getByRole('button', { name: /備份資料庫/ }));

    expect(props.onExport).toHaveBeenCalledTimes(1);
  });

  it('shows the error and success lines when provided', () => {
    renderSettings({ backupError: '匯出失敗', restoreSuccess: '還原完成' });

    expect(screen.getByText('匯出失敗')).toBeInTheDocument();
    expect(screen.getByText('還原完成')).toBeInTheDocument();
  });

  it('asks for confirmation through the shared dialog before restoring', async () => {
    const { container, props } = renderSettings();
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText('確認還原備份')).toBeInTheDocument();
    expect(screen.getByText(/backup\.json/)).toBeInTheDocument();
    expect(props.onRestore).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '確認還原' }));

    await waitFor(() => expect(props.onRestore).toHaveBeenCalledWith(file));
  });

  it('does not restore when the confirmation is cancelled', async () => {
    const { container, props } = renderSettings();
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(await screen.findByRole('button', { name: '取消' }));

    await waitFor(() => expect(screen.queryByText('確認還原備份')).not.toBeInTheDocument());
    expect(props.onRestore).not.toHaveBeenCalled();
  });
});
