import { act } from 'react';

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Dialog, DialogContent } from '@/ui/components/ui/dialog';

import { ConfirmDialogProvider } from './ConfirmDialog';
import { ConfirmDialogBody } from './ConfirmDialogBody';
import { resolveConfirmOptions } from './resolveConfirmOptions';
import { useConfirm } from './useConfirm';

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

describe('ConfirmDialogBody inline/live parity', () => {
  const TITLE = 'Delete transaction?';
  const CONTEXT = 'SEP 17 · ETF Purchase · -NT$20,000';
  const OPTIONS = { title: TITLE, context: CONTEXT };

  const renderInline = () =>
    render(<ConfirmDialogBody inline options={OPTIONS} onConfirm={() => {}} onCancel={() => {}} />);

  const renderLive = () =>
    render(
      <Dialog open>
        <DialogContent>
          <ConfirmDialogBody options={OPTIONS} onConfirm={() => {}} onCancel={() => {}} />
        </DialogContent>
      </Dialog>,
    );

  it('renders the title with the same classes inline as in the modal', () => {
    const inline = renderInline();
    const inlineClass = screen.getByText(TITLE).className;
    inline.unmount();

    renderLive();
    expect(screen.getByText(TITLE).className).toBe(inlineClass);
  });

  it('renders the context with the same classes inline as in the modal', () => {
    const inline = renderInline();
    const inlineClass = screen.getByText(CONTEXT).className;
    inline.unmount();

    renderLive();
    expect(screen.getByText(CONTEXT).className).toBe(inlineClass);
  });
});
