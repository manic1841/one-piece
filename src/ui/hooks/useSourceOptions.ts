import { useState } from 'react';

import { useLoadOnce } from '@/ui/hooks/useLoadOnce';

/**
 * The read behind a picker's option list. Both the ledger codes and the debt
 * accounts are the same thing: a list whose failure leaves the picker empty and
 * therefore looks like "nothing to pick".
 *
 * Bundling the three facts into one value is what lets a page hand a whole source
 * down as one prop instead of threading `items`, `errorMessage` and `reload`
 * separately through every layer.
 */
export interface SourceOptions<T> {
  items: T[];
  loading: boolean;
  /** `null` while the read is fine; the raw message once it failed. */
  errorMessage: string | null;
  /** Resolves once the replacement read settles, so callers can await a refresh. */
  reload: () => Promise<void>;
}

/**
 * Same contract as `useLoadOnce` (latest load wins, retry re-runs), narrowed to
 * the option-list shape so callers cannot drift from it.
 */
export function useSourceOptions<T>(
  task: (signal: AbortSignal) => Promise<T[]>,
  deps: unknown[],
): SourceOptions<T> {
  const [items, setItems] = useState<T[]>([]);
  const { loading, errorMessage, reload } = useLoadOnce(task, setItems, deps, {
    initiallyLoading: true,
  });

  return { items, loading, errorMessage, reload };
}
