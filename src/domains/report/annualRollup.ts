/** The fields every drawable analysis month carries. */
export interface RollablePoint {
  /** `YYYY-MM` for a month; becomes `YYYY` once rolled up. */
  yearMonth: string;
  /** The period is closed; a rolled-up year is closed only when every month is. */
  closed: boolean;
}

const groupByYear = <Point extends RollablePoint>(points: Point[]): [string, Point[]][] => {
  const groups = new Map<string, Point[]>();
  for (const point of points) {
    const year = point.yearMonth.slice(0, 4);
    groups.set(year, [...(groups.get(year) ?? []), point]);
  }
  return [...groups];
};

/** Stock series take the year's last month; the year key carries the provisional flag. */
export const rollUpStock = <Point extends RollablePoint>(points: Point[]): Point[] =>
  groupByYear(points).map(([year, group]) => ({
    ...(group[group.length - 1] as Point),
    yearMonth: year,
    closed: group.every((point) => point.closed),
  }));

/**
 * Flow series are combined across the year. `combine` returns the summed fields;
 * the year key and the provisional flag are applied here.
 */
export const rollUpByYear = <Point extends RollablePoint>(
  points: Point[],
  combine: (group: Point[], year: string) => Omit<Point, 'yearMonth' | 'closed'>,
): Point[] =>
  groupByYear(points).map(([year, group]) => ({
    ...combine(group, year),
    yearMonth: year,
    closed: group.every((point) => point.closed),
  })) as Point[];
