import { type SetStateAction, useCallback, useState } from 'react';

/**
 * The close stages' draft skeleton: a value that follows its source until the
 * user (or a confirm adopting authoritative rows) takes ownership of it.
 *
 * - `source === null` means **unknown** (the prefill has not arrived): nothing is
 *   seeded and no empty draft is fabricated, so an unloaded month is never shown
 *   as "clean".
 * - `[]` / `{}` mean a **known empty** value and are seeded like any other.
 * - Calling the setter makes the value **owned** for that key: later reloads of
 *   the same key never overwrite it. While it is not owned, the value keeps
 *   following the latest source.
 * - A key change (a month switch) retires the owned value, so the new key starts
 *   from its own source with no explicit `resetDraft` step.
 *
 * The setter takes a `SetStateAction` (a value or an updater). Two sequential
 * updates in one action — the trade drawer's delete both rewrites its rows and
 * records the removed ID — therefore compose instead of the second discarding
 * the first.
 */
export const useSeededDraft = <T>(
  key: string,
  source: T | null,
): [value: T | null, setValue: (updater: SetStateAction<T>) => void] => {
  // Only the owned value is state; an unowned draft is derived from `source`
  // during render. That keeps "follow the latest source" a plain expression
  // rather than a set-state-in-render that could loop on a fresh source identity.
  const [owned, setOwned] = useState<{ key: string; value: T } | null>(null);
  const value = owned && owned.key === key ? owned.value : source;

  // `key` and `source` are captured from the render that created the setter (so
  // a handler always writes against the current key) instead of being read from
  // refs during render.
  const setValue = useCallback(
    (updater: SetStateAction<T>) => {
      setOwned((previous) => {
        const base = previous && previous.key === key ? previous.value : (source as T);
        const next =
          typeof updater === 'function' ? (updater as (previousValue: T) => T)(base) : updater;
        return { key, value: next };
      });
    },
    [key, source],
  );

  return [value, setValue];
};
