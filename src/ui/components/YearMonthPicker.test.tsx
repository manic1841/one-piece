import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { YearMonthPicker } from './YearMonthPicker';

describe('YearMonthPicker', () => {
  it('renders a button-style trigger in year-month mode', () => {
    const onYearChange = vi.fn();
    const onMonthChange = vi.fn();

    render(
      <YearMonthPicker
        year={2026}
        month={3}
        onYearChange={onYearChange}
        onMonthChange={onMonthChange}
      />,
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('MAR 2026');
    expect(trigger).toHaveAttribute('aria-haspopup');
    expect(screen.queryByLabelText('年')).not.toBeInTheDocument();
  });

  it('renders a year-only trigger in year mode', () => {
    const onYearChange = vi.fn();

    render(<YearMonthPicker mode="year" year={2026} onYearChange={onYearChange} />);

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveTextContent('2026');
    expect(trigger).toHaveAttribute('aria-haspopup');
  });
});
