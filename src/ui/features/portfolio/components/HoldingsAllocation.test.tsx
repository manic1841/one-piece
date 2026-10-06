import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { type HoldingsAllocationVM } from '@/ui/features/portfolio/viewmodels/holdingsAllocation.vm';

import HoldingsAllocation from './HoldingsAllocation';

const vmWithData: HoldingsAllocationVM = {
  hasData: true,
  marketSegments: [
    { label: '0050', value: 200000 },
    { label: '2330', value: 100000 },
  ],
  exposureSegments: [
    { label: '0050', value: 200000 },
    { label: '2330', value: 300000 },
  ],
  marketTotalText: 'NT$300,000',
  exposureTotalText: 'NT$500,000',
};

const vmEmpty: HoldingsAllocationVM = {
  hasData: false,
  marketSegments: [],
  exposureSegments: [],
  marketTotalText: '—',
  exposureTotalText: '—',
};

describe('HoldingsAllocation', () => {
  it('renders both donuts with their own totals and aligned symbol labels', () => {
    render(<HoldingsAllocation vm={vmWithData} emptyText="沒有持倉" />);

    expect(screen.getByText('HOLDINGS ALLOCATION')).toBeInTheDocument();
    expect(screen.getByText('Market Value')).toBeInTheDocument();
    expect(screen.getByText('Exposure')).toBeInTheDocument();
    expect(screen.getByText('NT$300,000')).toBeInTheDocument();
    expect(screen.getByText('NT$500,000')).toBeInTheDocument();
    // One legend per donut, so each symbol label appears twice.
    expect(screen.getAllByText('0050')).toHaveLength(2);
    expect(screen.getAllByText('2330')).toHaveLength(2);
    expect(screen.getByLabelText('Market value allocation')).toBeInTheDocument();
    expect(screen.getByLabelText('Exposure allocation')).toBeInTheDocument();
  });

  it('shows the empty copy instead of a zero-value donut', () => {
    render(<HoldingsAllocation vm={vmEmpty} emptyText="沒有持倉" />);

    expect(screen.getByText('HOLDINGS ALLOCATION')).toBeInTheDocument();
    expect(screen.getByText('沒有持倉')).toBeInTheDocument();
    expect(screen.queryByLabelText('Market value allocation')).not.toBeInTheDocument();
  });
});
