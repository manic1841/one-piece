import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MobileExpandableRow } from './MobileDataRow';

describe('MobileExpandableRow', () => {
  it('is a plain row without details: no button role, no expand state', () => {
    render(<MobileExpandableRow data-testid="row" summary="Salary" value="+NT$1,000" />);

    const row = screen.getByTestId('row');
    expect(row).not.toHaveAttribute('role');
    expect(row).not.toHaveAttribute('aria-expanded');
  });

  /** The body stays mounted so the collapse can animate out (M05). */
  const bodyState = () =>
    screen.getByText('Details').closest('[data-state]')?.getAttribute('data-state');

  it('toggles details on click and reports aria-expanded', () => {
    render(<MobileExpandableRow data-testid="row" summary="Salary" details={<p>Details</p>} />);

    const row = screen.getByTestId('row');
    expect(row).toHaveAttribute('role', 'button');
    expect(row).toHaveAttribute('aria-expanded', 'false');
    expect(bodyState()).toBe('closed');

    fireEvent.click(row);
    expect(row).toHaveAttribute('aria-expanded', 'true');
    expect(bodyState()).toBe('open');

    fireEvent.click(row);
    expect(bodyState()).toBe('closed');
  });

  it('toggles with Enter and Space from the row itself', () => {
    render(<MobileExpandableRow data-testid="row" summary="Salary" details={<p>Details</p>} />);

    const row = screen.getByTestId('row');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(bodyState()).toBe('open');

    fireEvent.keyDown(row, { key: ' ' });
    expect(bodyState()).toBe('closed');
  });

  it('keeps action clicks from toggling the row', () => {
    const onEdit = vi.fn();
    render(
      <MobileExpandableRow
        data-testid="row"
        summary="Salary"
        details={<p>Details</p>}
        actions={
          <button type="button" onClick={onEdit}>
            Edit
          </button>
        }
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('row')).toHaveAttribute('aria-expanded', 'false');
    expect(bodyState()).toBe('closed');
  });
});
