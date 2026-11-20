import { describe, expect, it } from 'vitest';

import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';

import {
  type EventAxis,
  type EventVocabulary,
  buildEventRows,
  buildRuleSentence,
} from './retirementPlanRows.vm';

const NAMES: Record<string, string> = {
  'expense:rent': 'Rent',
  'debt:loan': 'Mortgage',
  'rule:salary': 'Salary',
};
const resolve = (source: { type: string; id: string }) => NAMES[source.id] ?? source.id;

const rule = (overrides: Partial<ProjectionRule> = {}): ProjectionRule =>
  ({
    id: 'rule-1',
    name: 'Apartment',
    ruleType: 'expense',
    enabled: true,
    method: 'inflation',
    source: { type: 'ledgerCode', id: 'expense:rent' },
    parameters: {},
    endCondition: { type: 'lifelong' },
    ...overrides,
  }) as ProjectionRule;

describe('buildRuleSentence', () => {
  it('reads as behaviour, then the end condition', () => {
    expect(buildRuleSentence(rule(), resolve)).toBe('follows inflation · Rent · for life');
  });

  it('drops a source that repeats the rule name', () => {
    expect(buildRuleSentence(rule({ name: 'Rent' }), resolve)).toBe('follows inflation · for life');
  });
  it('spells out a growth rate and keeps the source', () => {
    expect(
      buildRuleSentence(rule({ method: 'growthRate', parameters: { rate: 0.03 } }), resolve),
    ).toBe('3% annual growth · Rent · for life');
  });

  it('says a percentage is of its source', () => {
    expect(
      buildRuleSentence(
        rule({
          method: 'percentage',
          parameters: { ratio: 0.1 },
          source: { type: 'rule', id: 'rule:salary' },
        }),
        resolve,
      ),
    ).toBe('10% of Salary · for life');
  });

  it('names the amount of a fixed rule', () => {
    expect(
      buildRuleSentence(
        rule({ method: 'fixedAmount', parameters: { amount: 12_000 }, source: undefined }),
        resolve,
      ),
    ).toBe('NT$12,000 / year · for life');
  });

  it('reads a debt rule as the loan it follows', () => {
    expect(
      buildRuleSentence(
        rule({
          method: 'debtAmortization',
          source: { type: 'debtAccount', id: 'debt:loan' },
          endCondition: undefined,
        }),
        resolve,
      ),
    ).toBe('Mortgage · follows loan schedule');
  });

  it('spells out the keeps-pace flag on a non-inflation method only', () => {
    expect(
      buildRuleSentence(
        rule({ method: 'growthRate', parameters: { rate: 0.02 }, keepsPaceWithInflation: true }),
        resolve,
      ),
    ).toBe('2% annual growth · Rent · follows inflation · for life');
    expect(buildRuleSentence(rule({ keepsPaceWithInflation: true }), resolve)).toBe(
      'follows inflation · Rent · for life',
    );
  });

  it('turns age and year conditions into a phrase', () => {
    expect(
      buildRuleSentence(rule({ endCondition: { type: 'specificAge', age: 85 } }), resolve),
    ).toBe('follows inflation · Rent · through age 85');
    expect(
      buildRuleSentence(rule({ endCondition: { type: 'specificYear', year: 2050 } }), resolve),
    ).toBe('follows inflation · Rent · through 2050');
    expect(
      buildRuleSentence(rule({ endCondition: { type: 'retirementYearExclusive' } }), resolve),
    ).toBe('follows inflation · Rent · until retirement');
  });

  it('falls back to the raw id for an unresolvable source', () => {
    expect(
      buildRuleSentence(rule({ source: { type: 'ledgerCode', id: 'expense:unknown' } }), resolve),
    ).toBe('follows inflation · expense:unknown · for life');
  });
});

const VOCABULARY: EventVocabulary = {
  retiring: '退休年',
  before: '退休前',
  after: '退休後',
  income: '收入',
  expense: '支出',
};
const AXIS: EventAxis = { startYear: 2026, endYear: 2060, retirementYear: 2050 };

const event = (overrides: Partial<LifeEvent> = {}): LifeEvent =>
  ({
    id: 'event-1',
    name: 'Travel',
    type: 'expense',
    enabled: true,
    phases: [{ id: 'p1', name: 'Go', startYear: 2030, endYear: 2032, amount: 1000 }],
    ...overrides,
  }) as LifeEvent;

describe('buildEventRows', () => {
  it('prints a span and places the event before retirement', () => {
    const [row] = buildEventRows([event()], AXIS, VOCABULARY);

    expect(row.rangeText).toBe('2030–2032');
    expect(row.timingText).toBe('退休前');
    expect(row.typeText).toBe('支出');
  });

  it('prints a single year without a dash', () => {
    const [row] = buildEventRows(
      [event({ phases: [{ id: 'p1', name: 'Go', startYear: 2030, endYear: 2030, amount: 1 }] })],
      AXIS,
      VOCABULARY,
    );

    expect(row.rangeText).toBe('2030');
  });

  it('flags an event straddling the retirement year as the retiring year', () => {
    const [row] = buildEventRows(
      [event({ phases: [{ id: 'p1', name: 'Go', startYear: 2049, endYear: 2051, amount: 1 }] })],
      AXIS,
      VOCABULARY,
    );

    expect(row.timingText).toBe('退休年');
  });

  it('flags an event fully off the axis instead of clipping it', () => {
    const [row] = buildEventRows(
      [event({ phases: [{ id: 'p1', name: 'Go', startYear: 2000, endYear: 2005, amount: 1 }] })],
      AXIS,
      VOCABULARY,
    );

    expect(row.isOutside).toBe(true);
    expect(row.isClipped).toBe(false);
  });

  it('clamps a partly visible phase to the axis', () => {
    const [row] = buildEventRows(
      [event({ phases: [{ id: 'p1', name: 'Go', startYear: 2020, endYear: 2030, amount: 1 }] })],
      AXIS,
      VOCABULARY,
    );

    expect(row.isClipped).toBe(true);
    expect(row.phases[0].clippedStartYear).toBe(2026);
  });

  it('marks a disabled event', () => {
    const [row] = buildEventRows([event({ enabled: false })], AXIS, VOCABULARY);

    expect(row.isDisabled).toBe(true);
  });

  it('keeps a row for an event with no phases', () => {
    const [row] = buildEventRows([event({ phases: [] })], AXIS, VOCABULARY);

    expect(row.rangeText).toBe('—');
    expect(row.phases).toEqual([]);
  });
});
