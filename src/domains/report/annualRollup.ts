import { byMonth, yearOf } from './analysisScale';

/** The fields every drawable analysis month carries. */
export interface RollablePoint {
  /** `YYYY-MM` for a month; becomes `YYYY` once rolled up. */
  yearMonth: string;
  /** The period is closed; a rolled-up year is closed only when every month is. */
  closed: boolean;
}

/** Groups by year, oldest year and oldest month first, so callers need no order contract. */
const groupByYear = <Point extends RollablePoint>(points: Point[]): [string, Point[]][] => {
  const groups = new Map<string, Point[]>();
  for (const point of points) {
    const year = yearOf(point.yearMonth);
    groups.set(year, [...(groups.get(year) ?? []), point]);
  }
  return [...groups]
    .map(([year, group]): [string, Point[]] => [
      year,
      [...group].sort((a, b) => byMonth(a.yearMonth, b.yearMonth)),
    ])
    .sort(([a], [b]) => a.localeCompare(b));
};

/** The latest month in the group, independent of the input order. */
const latestOf = <Point extends RollablePoint>(group: Point[]): Point =>
  group.reduce((latest, point) => (point.yearMonth > latest.yearMonth ? point : latest));

/** The year key and its provisional flag: open when any covered month is open. */
const yearFacts = <Point extends RollablePoint>(
  group: Point[],
  year: string,
): { yearMonth: string; closed: boolean } => ({
  yearMonth: year,
  closed: group.every((point) => point.closed),
});

/** Stock series take the year's last month; the year key carries the provisional flag. */
export const rollUpStock = <Point extends RollablePoint>(points: Point[]): Point[] =>
  groupByYear(points).map(([year, group]) => ({
    ...latestOf(group),
    ...yearFacts(group, year),
  }));

/**
 * Flow series are combined across the year. `combine` returns the summed fields;
 * the year key and the provisional flag are applied here.
 */
export const rollUpByYear = <Point extends RollablePoint>(
  points: Point[],
  combine: (group: Point[]) => Omit<Point, 'yearMonth' | 'closed'>,
): Point[] =>
  groupByYear(points).map(([year, group]) => ({
    ...combine(group),
    ...yearFacts(group, year),
  })) as Point[];
