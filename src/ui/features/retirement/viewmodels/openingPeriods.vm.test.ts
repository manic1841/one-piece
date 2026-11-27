import { describe, expect, it } from 'vitest';

import { mapOpeningPeriodToVM } from './openingPeriods.vm';

describe('mapOpeningPeriodToVM', () => {
  it('formats the amount once and keeps the month as the anchor', () => {
    expect(mapOpeningPeriodToVM({ yearMonth: '2026-08', netWorth: 380_000.4 })).toEqual({
      anchorYearMonth: '2026-08',
      amountText: '380000',
      amountDisplay: 'NT$380,000',
    });
  });
});
