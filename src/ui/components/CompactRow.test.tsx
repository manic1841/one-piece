import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CompactRow from './CompactRow';

describe('CompactRow', () => {
  it('is not focusable when it has no click handler', () => {
    render(<CompactRow testId="row">value</CompactRow>);

    const row = screen.getByTestId('row');
    expect(row).not.toHaveAttribute('tabindex');
    expect(row).not.toHaveAttribute('role');
  });

  it('activates on Enter and Space when it has a click handler', () => {
    const onClick = vi.fn();
    render(
      <CompactRow testId="row" onClick={onClick}>
        value
      </CompactRow>,
    );

    const row = screen.getByTestId('row');
    expect(row).toHaveAttribute('role', 'button');
    expect(row).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('ignores keys that are not Enter or Space', () => {
    const onClick = vi.fn();
    render(
      <CompactRow testId="row" onClick={onClick}>
        value
      </CompactRow>,
    );

    fireEvent.keyDown(screen.getByTestId('row'), { key: 'a' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not activate when a nested control consumes the key', () => {
    const onClick = vi.fn();
    render(
      <CompactRow testId="row" onClick={onClick}>
        <button type="button" data-testid="grip">
          grip
        </button>
      </CompactRow>,
    );

    fireEvent.keyDown(screen.getByTestId('grip'), { key: ' ' });
    expect(onClick).not.toHaveBeenCalled();
  });
});
