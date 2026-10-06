/** Shared money semantics: one tone vocabulary for every money display (value + change line). */

export type MoneyTone = 'default' | 'positive' | 'negative';

/** Change lines add a `muted` "no signal" tone. */
export type MoneyChangeTone = MoneyTone | 'muted';

/** Value tone by sign, neutral at zero. */
export const signTone = (amount: number): MoneyTone =>
  amount > 0 ? 'positive' : amount < 0 ? 'negative' : 'default';

/** Text color for a money value. */
export const MONEY_TONE_CLASS: Record<MoneyTone, string> = {
  default: 'text-foreground',
  positive: 'text-positive',
  negative: 'text-negative',
};

/** Text color for a money change line. */
export const MONEY_CHANGE_TONE_CLASS: Record<MoneyChangeTone, string> = {
  ...MONEY_TONE_CLASS,
  muted: 'text-muted-foreground',
};
