import type { ReactElement } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LIVE_TOAST_OPTIONS, TOAST_TIMEOUT_MS, Toast, showToast } from './Toast';

vi.mock('sonner', () => ({ toast: { custom: vi.fn() } }));

const customMock = vi.mocked(toast.custom);

/** Render the element the Nth `toast.custom` call produced. */
function renderCustom(call: number): void {
  const renderFn = customMock.mock.calls[call][0] as (id: string) => ReactElement;
  render(renderFn('toast-id'));
}

describe('showToast', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the action label and fires the callback for an action toast', () => {
    const onAction = vi.fn();

    showToast('ROW DELETED', 'success', { actionLabel: 'UNDO', onAction });
    renderCustom(0);
    fireEvent.click(screen.getByRole('button', { name: 'UNDO' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('holds an action toast open for the shared timeout', () => {
    showToast('ROW DELETED', 'success', { actionLabel: 'UNDO', onAction: vi.fn() });

    expect(customMock.mock.calls[0][1]).toMatchObject({ duration: TOAST_TIMEOUT_MS });
  });

  it('keeps the plain call backward compatible: no action, default sonner duration', () => {
    showToast('TRANSACTION SAVED');
    renderCustom(0);

    expect(screen.queryByRole('button')).toBeNull();
    expect(customMock.mock.calls[0][1]).toEqual(LIVE_TOAST_OPTIONS);
  });
});

describe('Toast', () => {
  it('renders the message with a success glyph by default', () => {
    render(<Toast message="TRANSACTION SAVED" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('TRANSACTION SAVED');
    expect(status).toHaveTextContent('✓');
  });

  it('renders the error glyph for the error tone', () => {
    render(<Toast tone="error" message="SAVE FAILED" />);
    expect(screen.getByRole('status')).toHaveTextContent('!');
  });

  it('colors the glyph and message together from a single tone source', () => {
    const { rerender } = render(<Toast message="TRANSACTION SAVED" />);
    const success = screen.getByRole('status').firstElementChild as HTMLElement;
    expect(success).toHaveClass('text-positive');
    expect(success.querySelector('span')).not.toHaveClass('text-positive');

    rerender(<Toast tone="error" message="SAVE FAILED" />);
    const error = screen.getByRole('status').firstElementChild as HTMLElement;
    expect(error).toHaveClass('text-negative');
  });

  it('fires the action callback when the action button is clicked', () => {
    const onAction = vi.fn();
    render(<Toast message="TRANSACTION SAVED" actionLabel="UNDO" onAction={onAction} />);

    fireEvent.click(screen.getByRole('button', { name: 'UNDO' }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits the action button when no action label is given', () => {
    render(<Toast message="TRANSACTION SAVED" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
