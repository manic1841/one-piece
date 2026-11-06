import { describe, expect, it } from 'vitest';

import { rollUpByYear, rollUpStock } from './annualRollup';

interface Point {
  yearMonth: string;
  closed: boolean;
  value: number;
}

const month = (yearMonth: string, closed: boolean, value: number): Point => ({
  yearMonth,
  closed,
  value,
});

describe('annualRollup', () => {
  it('keeps the last month of each year for stock series', () => {
    const rolled = rollUpStock([
      month('2025-11', true, 1),
      month('2025-12', true, 2),
      month('2026-01', true, 3),
    ]);

    expect(rolled).toEqual([
      { yearMonth: '2025', closed: true, value: 2 },
      { yearMonth: '2026', closed: true, value: 3 },
    ]);
  });

  it('picks the latest month even when the input is not sorted', () => {
    const rolled = rollUpStock([
      month('2025-11', true, 1),
      month('2025-09', true, 9),
      month('2025-12', true, 2),
      month('2025-10', true, 10),
    ]);

    expect(rolled).toEqual([{ yearMonth: '2025', closed: true, value: 2 }]);
  });

  it('marks a year provisional when any month in it is open', () => {
    const rolled = rollUpStock([month('2026-01', true, 1), month('2026-02', false, 2)]);

    expect(rolled[0]?.closed).toBe(false);
  });

  it('combines flow series across the year and keeps the year key', () => {
    const rolled = rollUpByYear(
      [month('2025-12', true, 4), month('2026-01', true, 1), month('2026-02', false, 2)],
      (group) => ({ value: group.reduce((total, point) => total + point.value, 0) }),
    );

    expect(rolled).toEqual([
      { yearMonth: '2025', closed: true, value: 4 },
      { yearMonth: '2026', closed: false, value: 3 },
    ]);
  });

  it('orders the months inside a year so the first month is a stable base', () => {
    const rolled = rollUpByYear(
      [month('2025-12', true, 12), month('2025-01', true, 1), month('2025-06', true, 6)],
      (group) => ({ value: group[0]?.value ?? 0 }),
    );

    expect(rolled[0]?.value).toBe(1);
  });

  it('orders years oldest first regardless of input order', () => {
    const rolled = rollUpStock([month('2026-01', true, 2), month('2025-01', true, 1)]);

    expect(rolled.map((point) => point.yearMonth)).toEqual(['2025', '2026']);
  });

  it('leaves a monthly series alone and starts the year order from the oldest', () => {
    const points = [month('2026-01', true, 1), month('2026-02', true, 2)];

    expect(rollUpStock(points)).toHaveLength(1);
    expect(rollUpByYear(points, () => ({ value: 0 }))[0]?.yearMonth).toBe('2026');
    expect(rollUpStock([])).toEqual([]);
  });
});
