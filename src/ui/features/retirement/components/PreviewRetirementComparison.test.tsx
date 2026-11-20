import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mapProjectionSummaryToVM } from '@/ui/features/retirement/viewmodels/projectionView.vm';
import { type RetirementComparisonVM } from '@/ui/features/retirement/viewmodels/retirementComparison.vm';

import { PreviewRetirementComparison } from './PreviewRetirementComparison';

const summary = mapProjectionSummaryToVM({
  retirementNetWorth: 100,
  finalNetWorth: 200,
  minNetWorth: 100,
  minNetWorthYear: 2026,
  bankruptcyYear: null,
  isBankrupt: false,
});
const rows: RetirementComparisonVM[] = [60, 61, 62].map((age) => ({
  age,
  summary,
  finalDelta: '+NT$100',
  retirementDelta: '+NT$50',
  error: null,
}));

describe('PreviewRetirementComparison', () => {
  it('supports keyboard stepping, boundaries, and applying only the selected age', () => {
    const onApply = vi.fn();
    render(
      <PreviewRetirementComparison
        retirementAge={61}
        comparisons={rows}
        summary={summary}
        onApply={onApply}
      />,
    );
    const earlier = screen.getByRole('button', { name: 'Retire one year earlier' });
    const later = screen.getByRole('button', { name: 'Retire one year later' });
    expect(screen.getByRole('button', { name: 'USE AGE 61' })).toBeDisabled();
    fireEvent.keyDown(earlier, { key: 'ArrowLeft' });
    expect(earlier).toBeDisabled();
    fireEvent.keyDown(later, { key: 'ArrowLeft' });
    expect(screen.getByRole('columnheader', { name: 'Try · 60' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'USE AGE 60' }));
    expect(onApply).toHaveBeenCalledWith(60);
    fireEvent.keyDown(later, { key: 'ArrowRight' });
    fireEvent.keyDown(later, { key: 'ArrowRight' });
    expect(later).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '60', exact: true }));
    expect(screen.getByRole('columnheader', { name: 'Try · 60' })).toBeInTheDocument();
    expect(screen.getByRole('row', { name: /Final net worth/ })).toHaveTextContent('+NT$100');
  });

  it('shows failed trials explicitly and prevents applying them', () => {
    const failed: RetirementComparisonVM = {
      age: 60,
      summary: null,
      error: 'Missing source',
      finalDelta: null,
      retirementDelta: null,
    };
    render(
      <PreviewRetirementComparison
        retirementAge={61}
        comparisons={[failed, rows[1]!]}
        summary={summary}
        onApply={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retire one year earlier' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Missing source');
    expect(screen.getByRole('button', { name: 'USE AGE 60' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '61', exact: true })).not.toBeInTheDocument();
  });

  it('does not claim a safe age when every trial becomes negative', () => {
    const bankruptRows = rows.map((row) => ({
      ...row,
      summary: { ...summary, isBankrupt: true, bankruptcyYear: 2050, bankruptcyYearText: '2050' },
    }));
    render(
      <PreviewRetirementComparison
        retirementAge={61}
        comparisons={bankruptRows}
        summary={summary}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('No age in this range avoids negative net worth')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retire one year earlier' }));
    expect(
      within(screen.getByRole('row', { name: /Net worth turns negative/ })).getByText('2050'),
    ).toBeInTheDocument();
  });

  it('handles already-retired baselines and an empty future-age range', () => {
    const { rerender } = render(
      <PreviewRetirementComparison
        retirementAge={55}
        comparisons={rows}
        summary={summary}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByRole('columnheader', { name: 'Current · 55' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Try · 60' })).toBeInTheDocument();
    rerender(
      <PreviewRetirementComparison
        retirementAge={55}
        comparisons={[]}
        summary={summary}
        onApply={vi.fn()}
      />,
    );
    expect(
      screen.getByText('No future retirement age is available within this projection.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
