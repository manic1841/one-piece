import { describe, expect, it } from 'vitest';

import { SHEET_DISMISS_DISTANCE_RATIO, SHEET_DISMISS_VELOCITY, shouldDismiss } from './sheetDrag';

const HEIGHT = 400;

describe('shouldDismiss', () => {
  it('dismisses once the drag covers a quarter of the sheet', () => {
    expect(shouldDismiss(HEIGHT * SHEET_DISMISS_DISTANCE_RATIO, 0, HEIGHT)).toBe(true);
  });

  it('dismisses a flick that covers no distance', () => {
    expect(shouldDismiss(8, SHEET_DISMISS_VELOCITY, HEIGHT)).toBe(true);
  });

  it('settles back when neither threshold is met', () => {
    expect(shouldDismiss(20, 0.1, HEIGHT)).toBe(false);
  });

  it('settles back on an upward drag', () => {
    expect(shouldDismiss(-30, 0, HEIGHT)).toBe(false);
    expect(shouldDismiss(-30, 0.9, HEIGHT)).toBe(false);
  });

  it('falls back to velocity alone when the height is not measured yet', () => {
    expect(shouldDismiss(20, 0, 0)).toBe(false);
    expect(shouldDismiss(20, SHEET_DISMISS_VELOCITY, 0)).toBe(true);
  });
});
