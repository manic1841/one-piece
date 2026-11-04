import type { RetirementAssumptions } from './assumptions';
import type { LifeEvent } from './lifeEvents';
import type { ProjectionRule, RuleSource } from './projectionRules';
import type {
  AmountItem,
  ProjectionInput,
  ProjectionResolveError,
  ProjectionResolveErrorCode,
  ProjectionYearInput,
  RuleSourceSnapshot,
} from './projectionTypes';
import { resolveRuleGraph } from './ruleGraph';

export interface ResolveProjectionInputParams {
  assumptions: RetirementAssumptions;
  rules: ProjectionRule[];
  lifeEvents: LifeEvent[];
  startYear: number;
  opening: { amount: number | undefined; source: 'derived' | 'manual'; anchorYearMonth?: string };
  ledgerSources: Map<string, { netByYear: Map<number, number> }>;
  debtAccounts: Map<string, { monthlyPayment: number; endDate: Date }>;
}

export type ResolveProjectionInputResult =
  | {
      ok: true;
      input: ProjectionInput;
      ruleSources: RuleSourceSnapshot[];
      warnings: ProjectionResolveError[];
    }
  | {
      ok: false;
      errors: ProjectionResolveError[];
      warnings: ProjectionResolveError[];
    };

function failure(
  code: ProjectionResolveErrorCode,
  params: Record<string, unknown>,
): ProjectionResolveError {
  return { code, params, severity: 'error' };
}

function warning(
  code: ProjectionResolveErrorCode,
  params: Record<string, unknown>,
): ProjectionResolveError {
  return { code, params, severity: 'warning' };
}

function anchorYear(anchorYearMonth: string | undefined): number | undefined {
  if (anchorYearMonth === undefined || anchorYearMonth.length < 4) return undefined;
  const year = Number.parseInt(anchorYearMonth.slice(0, 4), 10);
  return Number.isNaN(year) ? undefined : year;
}

interface ResolverState {
  assumptions: RetirementAssumptions;
  firstYear: number;
  lastYear: number;
  retirementYear: number;
  ledgerSources: ResolveProjectionInputParams['ledgerSources'];
  debtAccounts: ResolveProjectionInputParams['debtAccounts'];
  errors: ProjectionResolveError[];
  warnings: ProjectionResolveError[];
  amountsByRule: Map<string, Map<number, number>>;
}

/** Deliberately not cached: a disabled reference reads as 0. */
function referencedAmount(state: ResolverState, ruleId: string, year: number): number {
  return state.amountsByRule.get(ruleId)?.get(year) ?? 0;
}

function resolveEndYear(
  rule: ProjectionRule,
  state: ResolverState,
  birthYear: number,
): number | undefined {
  const endCondition = rule.endCondition;
  if (endCondition === undefined) return undefined;

  switch (endCondition.type) {
    case 'retirementYearExclusive':
      return state.retirementYear - 1;
    case 'specificAge':
      return birthYear + endCondition.age;
    case 'specificYear':
      return endCondition.year;
    case 'lifelong':
      return state.lastYear;
  }
}

function resolveBaseline(
  rule: ProjectionRule,
  source: RuleSource,
  state: ResolverState,
  startYear: number,
): RuleSourceSnapshot | undefined {
  if (source.type === 'rule') {
    return {
      ruleId: rule.id,
      sourceType: source.type,
      sourceId: source.id,
      baselineYear: state.firstYear,
      baselineAmount: referencedAmount(state, source.id, state.firstYear),
    };
  }

  if (source.type === 'debtAccount') {
    const debt = state.debtAccounts.get(source.id);
    if (debt === undefined) {
      state.errors.push(
        failure('MISSING_DEBT_ACCOUNT', { ruleId: rule.id, debtAccountId: source.id }),
      );
      return undefined;
    }
    return {
      ruleId: rule.id,
      sourceType: source.type,
      sourceId: source.id,
      baselineYear: state.firstYear,
      baselineAmount: debt.monthlyPayment * 12,
    };
  }

  const ledger = state.ledgerSources.get(source.id);
  if (ledger === undefined) {
    state.errors.push(failure('MISSING_LEDGER_CODE', { ruleId: rule.id, ledgerCodeId: source.id }));
    return undefined;
  }

  const previousCompleteYear = startYear - 1;
  const baselineYear =
    rule.baselinePolicy === 'specificYear' && typeof rule.baselineYear === 'number'
      ? rule.baselineYear
      : rule.baselinePolicy === 'specificYear'
        ? undefined
        : previousCompleteYear;

  if (baselineYear === undefined) {
    state.errors.push(failure('MISSING_BASELINE', { kind: 'rule', ruleId: rule.id }));
    return undefined;
  }

  const net = ledger.netByYear.get(baselineYear);
  if (net === undefined) {
    state.errors.push(
      failure('LEDGER_BASELINE_EMPTY', {
        ruleId: rule.id,
        ruleName: rule.name,
        ledgerCodeId: source.id,
        baselineYear,
      }),
    );
    return undefined;
  }

  if (baselineYear < previousCompleteYear) {
    state.warnings.push(warning('BASELINE_BEHIND', { ruleId: rule.id, baselineYear }));
  } else if (baselineYear > previousCompleteYear) {
    state.warnings.push(warning('BASELINE_AFTER_START', { ruleId: rule.id, baselineYear }));
  }

  return {
    ruleId: rule.id,
    sourceType: source.type,
    sourceId: source.id,
    baselineYear,
    baselineAmount: Math.abs(net),
  };
}

function expandRule(
  rule: ProjectionRule,
  snapshot: RuleSourceSnapshot | undefined,
  state: ResolverState,
  startYear: number,
): Map<number, number> {
  const series = new Map<number, number>();

  if (rule.method === 'debtAmortization') {
    const sourceId = rule.source?.id;
    const debt = sourceId === undefined ? undefined : state.debtAccounts.get(sourceId);
    if (debt === undefined) return series;

    const endYear = debt.endDate.getFullYear();
    if (endYear < startYear) {
      state.warnings.push(
        warning('DEBT_ENDED_BEFORE_START', {
          ruleId: rule.id,
          debtAccountId: sourceId,
          endYear,
        }),
      );
      return series;
    }

    const lastYear = Math.min(endYear, state.lastYear);
    for (let year = startYear; year <= lastYear; year += 1) {
      series.set(year, debt.monthlyPayment * 12);
    }
    return series;
  }

  const endYear = resolveEndYear(rule, state, state.assumptions.birthYear);
  if (endYear === undefined || endYear < startYear) return series;

  const lastYear = Math.min(endYear, state.lastYear);
  const baselineYear = snapshot?.baselineYear ?? state.firstYear;
  const baselineAmount = snapshot?.baselineAmount ?? 0;
  const inflation = 1 + state.assumptions.inflationRate;

  let previous: number | undefined;
  for (let year = startYear; year <= lastYear; year += 1) {
    const raw = expandAmount(rule, year, baselineYear, baselineAmount, state);
    // The first year has no previous amount to hold. With negative inflation
    // the same expression is a ceiling rather than a floor.
    const amount =
      rule.keepsPaceWithInflation === true && previous !== undefined
        ? Math.max(raw, previous * inflation)
        : raw;

    series.set(year, amount);
    previous = amount;
  }

  return series;
}

function expandAmount(
  rule: ProjectionRule,
  year: number,
  baselineYear: number,
  baselineAmount: number,
  state: ResolverState,
): number {
  const elapsed = year - baselineYear;

  switch (rule.method) {
    case 'fixedAmount':
      return (rule.parameters as { amount: number }).amount;
    // A rule source already carries its own growth; grow the same-year amount
    // exactly once instead of compounding from a first-year snapshot (#312).
    case 'inflation':
      return rule.source?.type === 'rule'
        ? referencedAmount(state, rule.source.id, year) * (1 + state.assumptions.inflationRate)
        : baselineAmount * Math.pow(1 + state.assumptions.inflationRate, elapsed);
    case 'growthRate':
      return rule.source?.type === 'rule'
        ? referencedAmount(state, rule.source.id, year) *
            (1 + (rule.parameters as { rate: number }).rate)
        : baselineAmount * Math.pow(1 + (rule.parameters as { rate: number }).rate, elapsed);
    case 'percentage': {
      const sourceId = rule.source?.id;
      if (sourceId === undefined) return 0;
      return referencedAmount(state, sourceId, year) * (rule.parameters as { ratio: number }).ratio;
    }
    case 'debtAmortization':
      return 0;
  }
}

function appendItem(
  years: ProjectionYearInput[],
  firstYear: number,
  year: number,
  side: 'inflows' | 'outflows',
  item: AmountItem,
): void {
  years[year - firstYear]?.[side].push(item);
}

function resolveOpening(
  opening: ResolveProjectionInputParams['opening'],
  startYear: number,
  errors: ProjectionResolveError[],
  warnings: ProjectionResolveError[],
): number | undefined {
  if (opening.amount === undefined) {
    errors.push(failure('MISSING_BASELINE', { kind: 'opening' }));
    return undefined;
  }

  if (opening.source !== 'derived') return opening.amount;

  const anchor = anchorYear(opening.anchorYearMonth);
  if (anchor === undefined) return opening.amount;

  const code =
    anchor < startYear
      ? 'BASELINE_BEHIND'
      : anchor > startYear
        ? 'BASELINE_AFTER_START'
        : undefined;
  if (code !== undefined) {
    warnings.push(
      warning(code, { anchorYearMonth: opening.anchorYearMonth, anchorYear: anchor, startYear }),
    );
  }
  return opening.amount;
}

function expandRules(
  rules: ProjectionRule[],
  orderedIds: string[],
  startYear: number,
  state: ResolverState,
  years: ProjectionYearInput[],
): RuleSourceSnapshot[] {
  const ruleSources: RuleSourceSnapshot[] = [];
  const rulesById = new Map(rules.map((rule) => [rule.id, rule]));

  for (const id of orderedIds) {
    const rule = rulesById.get(id);
    if (rule === undefined) continue;

    const source = rule.source;
    const snapshot =
      source === undefined ? undefined : resolveBaseline(rule, source, state, startYear);
    if (snapshot !== undefined) ruleSources.push(snapshot);
    if (!rule.enabled) continue;

    const series = expandRule(rule, snapshot, state, startYear);
    state.amountsByRule.set(rule.id, series);

    for (const [year, amount] of series) {
      const side = rule.ruleType === 'income' ? 'inflows' : 'outflows';
      appendItem(years, state.firstYear, year, side, {
        sourceRef: rule.id,
        label: rule.name,
        origin: 'rule',
        amount,
      });
    }
  }

  return ruleSources;
}

function expandEvents(
  lifeEvents: LifeEvent[],
  assumptions: RetirementAssumptions,
  firstYear: number,
  lastYear: number,
  years: ProjectionYearInput[],
): void {
  for (const event of lifeEvents) {
    if (!event.enabled) continue;

    for (const phase of event.phases) {
      const from = Math.max(phase.startYear, firstYear);
      const to = Math.min(phase.endYear, lastYear);
      const growth = phase.growthRate ?? assumptions.inflationRate;

      for (let year = from; year <= to; year += 1) {
        const amount = phase.amount * Math.pow(1 + growth, year - phase.startYear);
        appendItem(years, firstYear, year, event.type === 'income' ? 'inflows' : 'outflows', {
          sourceRef: event.id,
          label: event.name,
          origin: 'event',
          amount,
        });
      }
    }
  }
}

/**
 * Resolve a validated plan into the engine contract. All business errors are
 * collected in one pass; nothing here throws.
 */
export function resolveProjectionInput(
  params: ResolveProjectionInputParams,
): ResolveProjectionInputResult {
  const { assumptions, rules, lifeEvents, startYear, opening } = params;

  const firstYear = startYear;
  const lastYear = assumptions.birthYear + assumptions.lifeExpectancy;
  const retirementYear = assumptions.birthYear + assumptions.retirementAge;

  const errors: ProjectionResolveError[] = [];
  const warnings: ProjectionResolveError[] = [];

  const openingAmount = resolveOpening(opening, startYear, errors, warnings);

  const graph = resolveRuleGraph(rules);
  const orderedIds = graph.ok ? graph.order : rules.map((rule) => rule.id);
  if (!graph.ok) {
    for (const error of graph.errors) {
      if (error.code === 'DANGLING_REFERENCE') {
        errors.push(
          failure('DANGLING_REFERENCE', { ruleId: error.ruleId, targetId: error.targetId }),
        );
      } else {
        errors.push(failure('CYCLE', { ruleIds: error.ruleIds }));
      }
    }
  }

  const state: ResolverState = {
    assumptions,
    firstYear,
    lastYear,
    retirementYear,
    ledgerSources: params.ledgerSources,
    debtAccounts: params.debtAccounts,
    errors,
    warnings,
    amountsByRule: new Map(),
  };

  const years: ProjectionYearInput[] = [];
  for (let year = firstYear; year <= lastYear; year += 1) {
    years.push({ year, inflows: [], outflows: [] });
  }

  const ruleSources = expandRules(rules, orderedIds, startYear, state, years);

  expandEvents(lifeEvents, assumptions, firstYear, lastYear, years);

  if (errors.length > 0) {
    return { ok: false, errors, warnings };
  }

  return {
    ok: true,
    input: {
      firstYear,
      lastYear,
      retirementYear,
      birthYear: assumptions.birthYear,
      openingNetWorth: openingAmount ?? 0,
      annualReturnRate: assumptions.annualReturnRate,
      years,
    },
    ruleSources,
    warnings,
  };
}
