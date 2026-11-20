import { describe, expect, it } from 'vitest';

import {
  DESKTOP_VISIBLE_YEARS,
  MOBILE_VISIBLE_YEARS,
  type TimelineEventInput,
  barGeometry,
  clampWindowStart,
  createDraftFromRange,
  deriveTimelineRange,
  initialTimelineFocus,
  initialWindowStart,
  mapTimelineRows,
  moveDraftFromDelta,
  moveTimelineFocus,
  panWindowStart,
  resizeDraftFromEdge,
  timelineBarLabel,
  timelineFocusBar,
  timelineWindowBounds,
  windowStartToRevealBar,
  yearAtPoint,
  yearsToPanDelta,
} from './retirementTimeline.vm';

const range = deriveTimelineRange({ currentYear: 2026, birthYear: 1986, lifeExpectancy: 90 });

const events: TimelineEventInput[] = [
  {
    id: 'e1',
    name: '子女教育',
    type: 'expense',
    phases: [
      { name: '幼兒園', startYear: 2028, endYear: 2030 },
      { startYear: 2035, endYear: 2035 },
    ],
  },
  {
    id: 'e2',
    name: '勞保年金',
    type: 'income',
    phases: [{ name: '月退', startYear: 2031, endYear: 2045 }],
  },
];

describe('deriveTimelineRange', () => {
  it('derives [currentYear, birthYear + lifeExpectancy]', () => {
    expect(range).toEqual({ startYear: 2026, endYear: 2076 });
  });
});

describe('timelineWindowBounds', () => {
  it('pans from projection start to projection end minus window length + 1', () => {
    expect(timelineWindowBounds(range, DESKTOP_VISIBLE_YEARS)).toEqual({
      minStart: 2026,
      maxStart: 2067,
    });
  });

  it('never lets maxStart fall below minStart for a shorter range', () => {
    expect(timelineWindowBounds({ startYear: 2030, endYear: 2032 }, 10)).toEqual({
      minStart: 2030,
      maxStart: 2030,
    });
  });
});

describe('initialWindowStart', () => {
  it('places the window containing currentYear', () => {
    expect(initialWindowStart(range, 2040, DESKTOP_VISIBLE_YEARS)).toBe(2040);
  });

  it('clamps to the pan bounds', () => {
    expect(initialWindowStart(range, 2070, DESKTOP_VISIBLE_YEARS)).toBe(2067);
    expect(initialWindowStart(range, 2000, DESKTOP_VISIBLE_YEARS)).toBe(2026);
  });
});

describe('panWindowStart / clampWindowStart', () => {
  const bounds = timelineWindowBounds(range, DESKTOP_VISIBLE_YEARS);

  it('adds the delta in years', () => {
    expect(panWindowStart(2030, 5, bounds)).toBe(2035);
    expect(panWindowStart(2030, -5, bounds)).toBe(2025 < bounds.minStart ? bounds.minStart : 2025);
    expect(panWindowStart(2028, -5, bounds)).toBe(2026);
  });

  it('clamps both edges', () => {
    expect(clampWindowStart(9999, bounds)).toBe(bounds.maxStart);
    expect(clampWindowStart(0, bounds)).toBe(bounds.minStart);
  });
});

describe('yearAtPoint / yearsToPanDelta', () => {
  const rect = { left: 100, width: 1000 };

  it('maps an x coordinate to the year cell under it', () => {
    expect(yearAtPoint(100, rect, 2026, 10)).toBe(2026); // first cell
    expect(yearAtPoint(199, rect, 2026, 10)).toBe(2026);
    expect(yearAtPoint(200, rect, 2026, 10)).toBe(2027);
    expect(yearAtPoint(1100, rect, 2026, 10)).toBe(2035); // clamped to last cell
    expect(yearAtPoint(0, rect, 2026, 10)).toBe(2026); // clamped left
  });

  it('converts a pixel drag into whole years', () => {
    expect(yearsToPanDelta(100, 1000, 10)).toBe(1);
    expect(yearsToPanDelta(-500, 1000, 10)).toBe(-5);
    expect(yearsToPanDelta(40, 1000, 10)).toBe(0);
  });
});

describe('mapTimelineRows', () => {
  it('groups one row per event with one bar per phase', () => {
    const rows = mapTimelineRows(events);
    expect(rows.map((row) => row.name)).toEqual(['子女教育', '勞保年金']);
    expect(rows[0].bars).toHaveLength(2);
    expect(rows[0].bars[0]).toMatchObject({
      id: 'e1:0',
      eventId: 'e1',
      index: 0,
      name: '幼兒園',
      tone: 'expense',
      startYear: 2028,
      endYear: 2030,
    });
  });

  it('falls back to the event name when a phase name is blank', () => {
    expect(mapTimelineRows(events)[0].bars[1].name).toBe('子女教育');
  });
});

describe('timelineBarLabel', () => {
  it('is `{name}，{start}–{end}`', () => {
    const bar = mapTimelineRows(events)[0].bars[0];
    expect(timelineBarLabel(bar)).toBe('幼兒園，2028–2030');
  });

  it('collapses a single year to `{name}，{start}`', () => {
    const bar = mapTimelineRows(events)[0].bars[1];
    expect(timelineBarLabel(bar)).toBe('子女教育，2035');
  });
});

describe('barGeometry', () => {
  it('maps a bar to fractions of the window', () => {
    expect(barGeometry({ startYear: 2028, endYear: 2029 }, 2026, 10)).toEqual({
      left: 0.2,
      width: 0.2,
      visible: true,
      clippedStart: false,
      clippedEnd: false,
    });
  });

  it('clamps a bar that overhangs the window edges and flags each clipped side', () => {
    const startClipped = barGeometry({ startYear: 2024, endYear: 2027 }, 2026, 10);
    expect(startClipped.left).toBe(0);
    expect(startClipped.width).toBeCloseTo(0.2);
    expect(startClipped).toMatchObject({ clippedStart: true, clippedEnd: false });

    const endClipped = barGeometry({ startYear: 2034, endYear: 2040 }, 2026, 10);
    expect(endClipped).toMatchObject({ clippedStart: false, clippedEnd: true });
  });

  it('flags both sides of a bar wider than the window', () => {
    expect(barGeometry({ startYear: 2020, endYear: 2040 }, 2026, 10)).toMatchObject({
      left: 0,
      width: 1,
      clippedStart: true,
      clippedEnd: true,
    });
  });

  it('marks a bar entirely outside the window as not visible', () => {
    expect(barGeometry({ startYear: 2040, endYear: 2042 }, 2026, 10)).toMatchObject({
      visible: false,
      width: 0,
    });
  });
});

describe('roving focus', () => {
  const rows = mapTimelineRows(events);

  it('starts on the first bar', () => {
    expect(initialTimelineFocus(rows)).toEqual({ rowIndex: 0, barIndex: 0 });
  });

  it('moves left/right within the row and clamps at the ends', () => {
    expect(moveTimelineFocus(rows, { rowIndex: 0, barIndex: 0 }, 'ArrowRight')).toEqual({
      rowIndex: 0,
      barIndex: 1,
    });
    expect(moveTimelineFocus(rows, { rowIndex: 0, barIndex: 1 }, 'ArrowRight')).toEqual({
      rowIndex: 0,
      barIndex: 1,
    });
    expect(moveTimelineFocus(rows, { rowIndex: 0, barIndex: 0 }, 'ArrowLeft')).toEqual({
      rowIndex: 0,
      barIndex: 0,
    });
  });

  it('moves up/down between rows toward the closest year', () => {
    // 幼兒園 starts 2028 (row 0); the only bar in row 1 starts 2031.
    expect(moveTimelineFocus(rows, { rowIndex: 0, barIndex: 0 }, 'ArrowDown')).toEqual({
      rowIndex: 1,
      barIndex: 0,
    });
    expect(moveTimelineFocus(rows, { rowIndex: 1, barIndex: 0 }, 'ArrowUp')).toEqual({
      rowIndex: 0,
      barIndex: 0,
    });
  });

  it('Home/End jump to the first/last bar of the composite', () => {
    expect(moveTimelineFocus(rows, { rowIndex: 1, barIndex: 0 }, 'Home')).toEqual({
      rowIndex: 0,
      barIndex: 0,
    });
    expect(moveTimelineFocus(rows, { rowIndex: 0, barIndex: 0 }, 'End')).toEqual({
      rowIndex: 1,
      barIndex: 0,
    });
  });

  it('resolves the focused bar and returns null when out of range', () => {
    expect(timelineFocusBar(rows, { rowIndex: 1, barIndex: 0 })?.name).toBe('月退');
    expect(timelineFocusBar(rows, { rowIndex: 9, barIndex: 0 })).toBeNull();
    expect(timelineFocusBar(rows, null)).toBeNull();
  });

  it('ignores rows without bars', () => {
    const withEmpty: TimelineEventInput[] = [
      ...events,
      { id: 'e3', name: '空', type: 'expense', phases: [] },
    ];
    const sparseRows = mapTimelineRows(withEmpty);
    expect(moveTimelineFocus(sparseRows, { rowIndex: 1, barIndex: 0 }, 'ArrowDown')).toEqual({
      rowIndex: 1,
      barIndex: 0,
    });
  });
});

describe('windowStartToRevealBar', () => {
  const bounds = timelineWindowBounds(range, DESKTOP_VISIBLE_YEARS);

  it('does not move when the bar is already visible', () => {
    expect(windowStartToRevealBar({ startYear: 2030, endYear: 2032 }, 2028, 10, bounds)).toBe(2028);
  });

  it('pans left when the bar starts before the window', () => {
    expect(windowStartToRevealBar({ startYear: 2026, endYear: 2027 }, 2030, 10, bounds)).toBe(2026);
  });

  it('pans right so the bar end is the last visible year', () => {
    expect(windowStartToRevealBar({ startYear: 2060, endYear: 2062 }, 2050, 10, bounds)).toBe(2053);
  });

  it('clamps to the pan bounds', () => {
    expect(windowStartToRevealBar({ startYear: 2000, endYear: 2001 }, 2050, 10, bounds)).toBe(2026);
  });
});

describe('drag drafts', () => {
  it('creates a single-year draft on a click and a span on a drag', () => {
    expect(createDraftFromRange('e1', 2028, 2028)).toEqual({
      kind: 'create',
      eventId: 'e1',
      startYear: 2028,
      endYear: 2028,
    });
    expect(createDraftFromRange('e1', 2030, 2028)).toEqual({
      kind: 'create',
      eventId: 'e1',
      startYear: 2028,
      endYear: 2030,
    });
  });

  it('resizes without crossing the opposite edge', () => {
    expect(
      resizeDraftFromEdge({
        eventId: 'e1',
        index: 0,
        edge: 'start',
        origStart: 2028,
        origEnd: 2030,
        year: 2035,
      }),
    ).toMatchObject({ startYear: 2030, endYear: 2030 });
    expect(
      resizeDraftFromEdge({
        eventId: 'e1',
        index: 0,
        edge: 'end',
        origStart: 2028,
        origEnd: 2030,
        year: 2020,
      }),
    ).toMatchObject({ startYear: 2028, endYear: 2028 });
  });

  it('moves a span keeping its length and clamps to the range', () => {
    const moved = moveDraftFromDelta({
      eventId: 'e1',
      index: 0,
      targetEventId: 'e2',
      origStart: 2028,
      origEnd: 2030,
      deltaYears: 3,
      range,
    });
    expect(moved).toMatchObject({
      kind: 'move',
      fromEventId: 'e1',
      targetEventId: 'e2',
      startYear: 2031,
      endYear: 2033,
    });

    const clamped = moveDraftFromDelta({
      eventId: 'e1',
      index: 0,
      targetEventId: 'e1',
      origStart: 2028,
      origEnd: 2030,
      deltaYears: -100,
      range,
    });
    expect(clamped.startYear).toBe(range.startYear);
  });
});

describe('mobile window', () => {
  it('uses 5 visible years on mobile and pan bounds follow', () => {
    expect(MOBILE_VISIBLE_YEARS).toBe(5);
    expect(timelineWindowBounds(range, MOBILE_VISIBLE_YEARS)).toEqual({
      minStart: 2026,
      maxStart: 2072,
    });
  });
});
