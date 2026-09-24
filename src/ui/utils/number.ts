/**
 * Number formatting utilities
 */

/**
 * Currency symbols, keyed by currency code. `USD` is `US$`, never a bare `$`,
 * so it stays distinguishable from TWD when the two appear side by side.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  TWD: 'NT$',
  USD: 'US$',
  EUR: '€',
  JPY: '¥',
};

/**
 * Format a money amount, symbol-first, without decimal places.
 *
 * Defaults to the base currency (TWD); pass a `CurrencyType` for a foreign
 * amount. An unrecognised code degrades to a code suffix (`1,234 GBP`) rather
 * than a wrong symbol.
 *
 * @param amount - The amount to format
 * @param currency - Currency code (default: "TWD")
 * @returns Formatted currency string (e.g., "NT$1,234", "-NT$200", "US$12,000")
 */
export const formatCurrency = (amount: number, currency: string = 'TWD'): string => {
  const symbol = CURRENCY_SYMBOLS[currency];
  const digits = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  if (!symbol) return `${amount < 0 ? '-' : ''}${digits} ${currency}`;
  return `${amount < 0 ? '-' : ''}${symbol}${digits}`;
};

/**
 * Format a number as a percentage
 * @param value - The percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string (e.g., "45.5%")
 */
export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format a large number with K/M/B suffixes
 * @param num - The number to format
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 */
export const formatCompactNumber = (num: number): string => {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'K';
  }
  return num.toString();
};
