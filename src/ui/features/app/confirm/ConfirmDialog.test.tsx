import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  ConfirmDialogProvider,
  resolveConfirmOptions,
  useConfirm,
} from './ConfirmDialog';

const buttonLabel = 'Delete transaction?';

function Probe({
  onResult,
  options,
}: {
  onResult: (result: boolean) => void;
  options?: Parameters<ReturnType<typeof useConfirm>['confirm']>[0];
}) {
  const { confirm } = useConfirm();
  return (
    <button
      type="button"
      onClick={() => {
        void confirm(options ?? buttonLabel).then(onResult);
      }}
    >
      trigger
    </button>
  );
}

describe('ConfirmDialog', () => {
  it('renders title, context, and consequence from structured options', () => {
    expect(
      resolveConfirmOptions({
        title: 'Delete transaction?',
        context: 'This transaction has allocations.',
        consequence: 'This action cannot be undone.',
      }),
    ).toEqual({
      title: 'Delete transaction?',
      context: 'This transaction has allocations.',
      consequence: 'This action cannot be undone.',
      confirmLabel: 'DELETE',
      cancelLabel: 'Cancel',
    });
  });

  it('maps a plain string to the destructive default copy', () => {
    expect(resolveConfirmOptions(buttonLabel)).toEqual({
      title: buttonLabel,
      context: undefined,
      consequence: 'This action cannot be undone.',
      confirmLabel: 'DELETE',
      cancelLabel: 'Cancel',
    });
  });

  it('resolves the promise with true on confirm', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmDialogProvider>
        <Probe onResult={onResult} />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'trigger' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'DELETE' }));
    });

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
  });

  it('resolves the promise with false on cancel', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmDialogProvider>
        <Probe onResult={onResult} />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'trigger' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it('resolves pending promises with false when the dialog is dismissed', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmDialogProvider>
        <Probe onResult={onResult} />
      </ConfirmDialogProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'trigger' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
