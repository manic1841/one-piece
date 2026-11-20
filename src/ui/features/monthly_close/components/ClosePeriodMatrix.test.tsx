import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ClosePeriodMatrix } from './ClosePeriodMatrix';

const months = [
  { yearMonth: '2026-02', monthText: '2 月', status: 'CLOSED', statusText: '已關帳' },
  { yearMonth: '2026-03', monthText: '3 月', status: 'NOT_STARTED', statusText: '未開始' },
] as const;

describe('ClosePeriodMatrix', () => {
  it('offers every month with its status', () => {
    render(
      <ClosePeriodMatrix months={[...months]} selectedYearMonth="2026-03" onSelect={() => {}} />,
    );

    expect(screen.getByText('最近六個月')).toBeInTheDocument();
    expect(screen.getByText('已關帳')).toBeInTheDocument();
    expect(screen.getByText('未開始')).toBeInTheDocument();
  });

  it('marks the selected month and reports picks', () => {
    const onSelect = vi.fn();
    render(
      <ClosePeriodMatrix months={[...months]} selectedYearMonth="2026-03" onSelect={onSelect} />,
    );

    expect(screen.getByRole('button', { name: /3 月/ })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: /2 月/ }));
    expect(onSelect).toHaveBeenCalledWith('2026-02');
  });
});
