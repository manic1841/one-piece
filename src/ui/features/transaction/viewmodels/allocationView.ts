import { PROJECT_DETAIL_LABELS } from '@/ui/constants/project/projectDetailLabels';

import { type AllocationDraftItem } from '../types/allocation';
import { type TransactionFormProjectOption } from '../types/transaction';

/**
 * Project-attribution derivations, kept out of the component so the render body
 * stays presentation only.
 */

export type AllocationSlice = {
  id: string;
  name: string;
  percentage: number;
  color: string;
  /** The project is not in the current option list (e.g. it was deactivated). */
  inactive: boolean;
};

/** Blank or unparsable shares read as 0, so a row never adds `NaN` to a total. */
export const toPositiveNumber = (value: string | number | undefined) => {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Equal split with the remainder on the last row, so the total is exactly 100.
 * 2 → 50/50, 3 → 33.3/33.3/33.4.
 */
export const equalPercentages = (count: number): string[] => {
  const base = Math.round((100 / count) * 10) / 10;
  const head = Array.from({ length: count - 1 }, () => base);
  const last = Math.round((100 - base * (count - 1)) * 10) / 10;
  return [...head, last].map((value) => String(value));
};

/**
 * Percentages for projects being added to an existing selection: they share
 * whatever is left of 100, so percentages the user already edited survive. A
 * selection already at (or over) 100 gets zeros — the total error shows it.
 */
export const appendShares = (existingPercentages: string[], addedCount: number): string[] => {
  const total = existingPercentages.reduce((sum, value) => sum + toPositiveNumber(value), 0);
  const remaining = Math.max(0, 100 - total);
  return equalPercentages(addedCount).map((share) =>
    String(Math.round((toPositiveNumber(share) * remaining) / 10) / 10),
  );
};

/**
 * Read-view rows, largest share first. Colors follow selection order so a
 * project keeps its color while its percentage changes.
 */
export const buildAllocationSlices = ({
  selectedIds,
  items,
  projects,
  color,
}: {
  selectedIds: string[];
  items: AllocationDraftItem[];
  projects: TransactionFormProjectOption[];
  color: (index: number) => string;
}): AllocationSlice[] =>
  selectedIds
    .map((id, index) => {
      const project = projects.find((item) => item.id === id);
      // A direct link has no item row of its own; it is always a full share.
      const rawPercentage = items.find((item) => item.projectId === id)?.percentage;
      return {
        id,
        name: project?.name ?? PROJECT_DETAIL_LABELS.INACTIVE_BADGE,
        percentage: toPositiveNumber(rawPercentage ?? (items.length === 0 ? '100' : '0')),
        color: color(index),
        inactive: !project,
      };
    })
    .sort((a, b) => b.percentage - a.percentage);
