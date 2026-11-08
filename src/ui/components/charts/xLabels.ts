/**
 * x-axis label density, shared by every chart that draws a time axis.
 *
 * Two charts independently grew the same rule (drop labels until the slots fit,
 * then drop repeated years), so it lives here instead of twice.
 */
export const MAX_X_LABELS = 6;

/** Narrowest slot an x label may occupy before the next one is dropped. */
export const MIN_X_LABEL_SLOT = 64;

/** Smallest number of labels kept; the first and last data points always stay labelled. */
const MIN_X_LABELS = 2;

const MONTH_LABEL = /^([A-Z]{3}) (\d{4})$/;

/**
 * Column indices to render as x-axis labels: an evenly spaced subset, always
 * including the last. `maxLabels` is clamped so at least two survive.
 */
export function pickXLabels(count: number, maxLabels: number = MAX_X_LABELS): number[] {
  if (count === 0) return [];
  if (count === 1) return [0];
  // Spread `budget` labels over the whole span so the last gap matches the rest.
  const budget = Math.max(MIN_X_LABELS, Math.min(maxLabels, count));
  const step = Math.max(1, Math.ceil((count - 1) / (budget - 1)));
  const indices: number[] = [];
  for (let index = 0; index < count; index += step) indices.push(index);
  if (indices[indices.length - 1] !== count - 1) indices.push(count - 1);
  return indices;
}

/**
 * Drop the repeated year so neighbouring labels fit; the first label keeps it.
 */
export const shortenXLabels = (
  labels: string[],
  indices: number[],
): { index: number; text: string }[] => {
  let previousYear: string | null = null;
  return indices.map((index) => {
    const raw = labels[index];
    const match = MONTH_LABEL.exec(raw);
    if (match === null) return { index, text: raw };
    const text = match[2] === previousYear ? match[1] : raw;
    previousYear = match[2];
    return { index, text };
  });
};

/**
 * How many labels fit a plot of `width` px, never more than `MAX_X_LABELS` and
 * never below the two-label floor. `null` (not measured yet) keeps the full cap.
 */
export const xLabelBudget = (width: number | null): number =>
  width === null
    ? MAX_X_LABELS
    : Math.max(MIN_X_LABELS, Math.min(MAX_X_LABELS, Math.floor(width / MIN_X_LABEL_SLOT)));
