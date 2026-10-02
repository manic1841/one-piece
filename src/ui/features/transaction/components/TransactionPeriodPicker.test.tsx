import { useState } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { type TransactionPeriod, TransactionPeriodPicker } from './TransactionPeriodPicker';

beforeAll(() => {
  Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
  Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
  Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
  Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
});

interface HarnessProps {
  initialPeriod: TransactionPeriod;
  onPeriodChange?: (period: TransactionPeriod) => void;
  onRangeChange?: (range: { fromDate?: Date; toDate?: Date }) => void;
}

const PickerHarness = ({ initialPeriod, onPeriodChange, onRangeChange }: HarnessProps) => {
  const [period, setPeriod] = useState(initialPeriod);
  return (
    <TransactionPeriodPicker
      period={period}
      onPeriodChange={(next) => {
        onPeriodChange?.(next);
        setPeriod(next);
      }}
      onRangeChange={(range) => onRangeChange?.(range)}
    />
  );
};

const renderPicker = (overrides: Partial<Parameters<typeof TransactionPeriodPicker>[0]> = {}) => {
  const onPeriodChange = vi.fn();
  const onRangeChange = vi.fn();
  render(
    <PickerHarness
      initialPeriod={overrides.period ?? 'CURRENT_MONTH'}
      onPeriodChange={onPeriodChange}
      onRangeChange={onRangeChange}
    />,
  );
  return { onPeriodChange, onRangeChange };
};

const selectPeriod = (label: string) => {
  fireEvent.click(screen.getByRole('radio', { name: label }));
};

describe('TransactionPeriodPicker', () => {
  it('renders the trigger labelled with the active preset', () => {
    renderPicker({ period: 'CURRENT_MONTH' });

    expect(screen.getByRole('button', { name: /本月/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /本月/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('commits a preset immediately and closes the popover without showing date fields', () => {
    const { onPeriodChange, onRangeChange } = renderPicker({ period: 'CURRENT_MONTH' });

    fireEvent.click(screen.getByRole('button', { name: /本月/ }));
    selectPeriod('最近 3 個月');

    expect(onPeriodChange).toHaveBeenCalledWith('LAST_3_MONTHS');
    expect(onRangeChange).not.toHaveBeenCalled();
  });

  it('keeps the popover open on CUSTOM and reveals From/To with a apply button', () => {
    renderPicker({ period: 'CURRENT_MONTH' });

    fireEvent.click(screen.getByRole('button', { name: /本月/ }));
    selectPeriod('自訂日期');

    expect(screen.getByText(/^FROM$/)).toBeInTheDocument();
    expect(screen.getByText(/^TO$/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '套用' })).toBeInTheDocument();
  });

  it('applies a custom range with inclusive bounds and rejects an inverted range', () => {
    const { onRangeChange } = renderPicker({ period: 'CURRENT_MONTH' });

    fireEvent.click(screen.getByRole('button', { name: /本月/ }));
    selectPeriod('自訂日期');
    fireEvent.change(screen.getByLabelText('FROM'), { target: { value: '2026-09-10' } });
    fireEvent.change(screen.getByLabelText('TO'), { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: '套用' }));

    expect(screen.getByText('開始日期不可晚於結束日期')).toBeVisible();
    expect(onRangeChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('TO'), { target: { value: '2026-09-20' } });
    fireEvent.click(screen.getByRole('button', { name: '套用' }));

    expect(onRangeChange).toHaveBeenCalledWith({
      fromDate: new Date('2026-09-10T00:00:00'),
      toDate: new Date('2026-09-20T23:59:59.999'),
    });
  });
});
