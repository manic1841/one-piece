import { useState } from 'react';

/** Legend visibility for one chart, seeded with the series that start visible. */
export const useSeriesToggle = <K extends string>(initial: readonly K[]) => {
  const [active, setActive] = useState<ReadonlySet<K>>(() => new Set(initial));
  const isActive = (key: K): boolean => active.has(key);
  const toggle = (key: K) =>
    setActive((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return { isActive, toggle };
};

/** A chart click handler that drills into the clicked point's report. */
export const pointActivator =
  <T extends { yearMonth: string }>(points: T[], activate: (yearMonth: string) => void) =>
  (index: number) => {
    const point = points[index];
    if (point !== undefined) activate(point.yearMonth);
  };
