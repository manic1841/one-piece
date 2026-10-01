import { type SetStateAction, useCallback, useState } from 'react';

/** The close stages' draft skeleton: a value that follows its source until the user owns it. */
export const useSeededDraft = <T>(
  source: T | null,
): [value: T | null, setValue: (updater: SetStateAction<T>) => void] => {
  // Only the owned value is state; an unowned draft is derived from `source` in render.
  const [owned, setOwned] = useState<T | null>(null);
  const value = owned ?? source;

  const setValue = useCallback(
    (updater: SetStateAction<T>) => {
      setOwned((previous) => {
        const base = previous ?? (source as T);
        return typeof updater === 'function' ? (updater as (previousValue: T) => T)(base) : updater;
      });
    },
    [source],
  );

  return [value, setValue];
};
