import { type SelectFieldOption } from '@/ui/components/form';
import { RETIREMENT_YEAR_BOUNDS } from '@/ui/constants/retirement/bounds';

/**
 * Contiguous number options for a select field, used by every year and age
 * field in the retirement workspace. The bounds come from the domain so the
 * list can only offer values the schema accepts.
 */
export function numberOptions(min: number, max: number): SelectFieldOption[] {
  return Array.from({ length: max - min + 1 }, (_, index) => {
    const value = String(min + index);
    return { value, label: value };
  });
}

/** Year options for the fields that share the projection-year range. */
export const RETIREMENT_YEAR_OPTIONS = numberOptions(
  RETIREMENT_YEAR_BOUNDS.min,
  RETIREMENT_YEAR_BOUNDS.max,
);
