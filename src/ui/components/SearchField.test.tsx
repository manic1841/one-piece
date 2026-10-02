import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchField } from './SearchField';

describe('SearchField', () => {
  it('carries a programmatic name instead of relying on the placeholder', () => {
    render(
      <SearchField
        value=""
        onValueChange={vi.fn()}
        placeholder="搜尋交易或備註..."
        ariaLabel="搜尋交易"
      />,
    );

    const input = screen.getByRole('searchbox', { name: '搜尋交易' });
    expect(input).toHaveAttribute('placeholder', '搜尋交易或備註...');
  });

  it('reports typed text', () => {
    const onValueChange = vi.fn();
    render(<SearchField value="" onValueChange={onValueChange} ariaLabel="搜尋交易" />);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '租金' } });

    expect(onValueChange).toHaveBeenCalledWith('租金');
  });

  it('hides the leading icon from assistive technology', () => {
    const { container } = render(
      <SearchField value="" onValueChange={vi.fn()} ariaLabel="搜尋交易" />,
    );

    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
