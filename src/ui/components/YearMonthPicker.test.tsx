import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { YearMonthPicker } from './YearMonthPicker';

vi.mock('@/ui/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select
      data-testid="month-select"
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ id, children }: any) => <>{children || <span id={id} />}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

describe('YearMonthPicker', () => {
  it('renders year and month controls in year-month mode', () => {
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

    expect(screen.getByLabelText('年')).toBeInTheDocument();
    expect(screen.getByText('月')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('年'), { target: { value: '2027' } });
    expect(onYearChange).toHaveBeenCalledWith('2027');

    fireEvent.change(screen.getByTestId('month-select'), { target: { value: '5' } });
    expect(onMonthChange).toHaveBeenCalledWith('5');
  });

  it('renders only year control in year mode', () => {
    const onYearChange = vi.fn();

    const { container } = render(
      <YearMonthPicker mode="year" year={2026} onYearChange={onYearChange} yearLabel="年份" />,
    );

    expect(screen.getByLabelText('年份')).toBeInTheDocument();
    expect(screen.queryByText('月')).not.toBeInTheDocument();
    expect(screen.queryByTestId('month-select')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass('grid-cols-1');

    fireEvent.change(screen.getByLabelText('年份'), { target: { value: '2028' } });
    expect(onYearChange).toHaveBeenCalledWith('2028');
  });
});
