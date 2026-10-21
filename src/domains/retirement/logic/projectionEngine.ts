import type {
  AmountItem,
  ProjectionInput,
  ProjectionResult,
  ProjectionYearResult,
} from './projectionTypes';

export const ENGINE_VERSION = 1;

function fail(message: string): never {
  throw new RangeError(message);
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) fail(`${label} must be an integer`);
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) fail(`${label} must be finite`);
}

function assertAmounts(items: AmountItem[], label: string): void {
  for (const item of items) {
    assertFinite(item.amount, `${label} amount`);
    if (item.amount < 0) fail(`${label} amount must be non-negative`);
  }
}

function validate(input: ProjectionInput): void {
  assertInteger(input.firstYear, 'firstYear');
  assertInteger(input.lastYear, 'lastYear');
  assertInteger(input.birthYear, 'birthYear');
  assertInteger(input.retirementYear, 'retirementYear');
  assertFinite(input.openingNetWorth, 'openingNetWorth');
  assertFinite(input.annualReturnRate, 'annualReturnRate');

  if (input.firstYear > input.lastYear) fail('firstYear must not exceed lastYear');

  for (const [index, year] of input.years.entries()) {
    assertInteger(year.year, `years[${index}].year`);
    const expected = input.firstYear + index;
    if (year.year !== expected) {
      fail(`years must be consecutive from firstYear (expected ${expected}, got ${year.year})`);
    }
    if (year.year > input.lastYear) fail(`year ${year.year} is outside the range`);
    assertAmounts(year.inflows, `years[${index}].inflows`);
    assertAmounts(year.outflows, `years[${index}].outflows`);
  }
}

function round(value: number): number {
  const rounded = Math.round(value);
  return rounded === 0 ? 0 : rounded;
}

function sum(items: AmountItem[]): number {
  let total = 0;
  for (const item of items) total += item.amount;
  return total;
}

/**
 * Pure and synchronous: the caller gets an assertable result for any valid
 * input, and only invariant violations leave as `RangeError`.
 */
export function calculateProjection(input: ProjectionInput): ProjectionResult {
  validate(input);

  const { birthYear, retirementYear, firstYear, lastYear, annualReturnRate } = input;

  let retirementNetWorth: number | null | undefined;
  if (retirementYear > lastYear) retirementNetWorth = null;
  else if (retirementYear <= firstYear) retirementNetWorth = round(input.openingNetWorth);

  let opening = input.openingNetWorth;
  let minNetWorth = Number.POSITIVE_INFINITY;
  let minNetWorthYear: number | null = null;
  let bankruptcyYear: number | null = null;
  const years: ProjectionYearResult[] = [];

  for (const year of input.years) {
    const inflows = sum(year.inflows);
    const outflows = sum(year.outflows);
    const investmentReturn = opening * annualReturnRate;
    const closing = opening + inflows - outflows + investmentReturn;

    if (closing < minNetWorth) {
      minNetWorth = closing;
      minNetWorthYear = year.year;
    }
    if (bankruptcyYear === null && closing < 0) bankruptcyYear = year.year;
    if (retirementNetWorth === undefined && year.year === retirementYear) {
      retirementNetWorth = round(opening);
    }

    years.push({
      year: year.year,
      age: year.year - birthYear,
      isRetired: year.year >= retirementYear,
      opening: round(opening),
      return: round(investmentReturn),
      inflows: round(inflows),
      outflows: round(outflows),
      closing: round(closing),
    });

    opening = closing;
  }

  const finalNetWorth = round(opening);
  if (years.length === 0) minNetWorth = input.openingNetWorth;

  return {
    years,
    summary: {
      retirementNetWorth:
        retirementNetWorth === undefined ? round(input.openingNetWorth) : retirementNetWorth,
      finalNetWorth,
      minNetWorth: round(minNetWorth),
      minNetWorthYear,
      bankruptcyYear,
      isBankrupt: bankruptcyYear !== null,
    },
  };
}
