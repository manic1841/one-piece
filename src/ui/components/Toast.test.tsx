import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Toast } from './Toast';

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
