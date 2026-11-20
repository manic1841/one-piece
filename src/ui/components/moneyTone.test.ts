import { describe, expect, it } from 'vitest';

import { MONEY_TONE_CLASS, signTone } from './moneyTone';

/** Zero is the absence of a direction, not a positive number. */
describe('signTone', () => {
  it('marks gains positive and losses negative', () => {
    expect(signTone(1)).toBe('positive');
    expect(signTone(-1)).toBe('negative');
  });

  it('treats zero as neutral, never as a gain', () => {
    expect(signTone(0)).toBe('zero');
  });

  it('renders a zero in muted foreground so it does not read as a result', () => {
    expect(MONEY_TONE_CLASS.zero).toBe('text-muted-foreground');
  });
});
