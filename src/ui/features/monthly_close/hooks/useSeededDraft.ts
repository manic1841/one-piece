import { type SetStateAction, useCallback, useState } from 'react';

/** The close stages' draft skeleton: a value that follows its source until the user owns it. */
export const useSeededDraft = <T>(
  key: string,
  source: T | null,
): [value: T | null, setValue: (updater: SetStateAction<T>) => void] => {
  // Only the owned value is state; an unowned draft is derived from `source` in render.
  const [owned, setOwned] = useState<{ key: string; value: T } | null>(null);
  const value = owned && owned.key === key ? owned.value : source;

  // `key`/`source` are captured from the creating render, so a handler always
  // writes against the current key instead of reading refs during render.
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
