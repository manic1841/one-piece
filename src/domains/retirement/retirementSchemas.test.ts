import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createAssumptionsSchema, createAssumptionsUpdateSchema } from './assumptions';
import { RETIREMENT_ASSUMPTION_BOUNDS } from './bounds';
import { RetirementSchemaErrorCode } from './errorCodes';
import { LifeEventSchema } from './lifeEvents';
import { ALLOWED_METHODS_BY_RULE_TYPE, ProjectionRulesSchema } from './projectionRules';
import { resolveRuleGraph } from './ruleGraph';
import { createRetirementPlanCreateSchema, createRetirementPlanUpdateSchema } from './schemas';

const CURRENT_YEAR = 2026;

function validAssumptions(overrides: Record<string, unknown> = {}) {
  return {
    birthYear: 1990,
    retirementAge: 65,
    lifeExpectancy: 85,
    inflationRate: 0.02,
    annualReturnRate: 0.05,
    ...overrides,
  };
}

function parseAssumptions(overrides: Record<string, unknown> = {}) {
  return createAssumptionsSchema(CURRENT_YEAR).safeParse(validAssumptions(overrides));
}

function codes(result: z.ZodSafeParseResult<unknown>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
}

function issueWith(result: z.ZodSafeParseResult<unknown>, code: string) {
  return result.success ? undefined : result.error.issues.find((issue) => issue.message === code);
}

function validRule(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rule-1',
    name: 'Fixed',
    ruleType: 'expense',
    method: 'fixedAmount',
    parameters: { amount: 100 },
    endCondition: { type: 'lifelong' },
    ...overrides,
  };
}

const ledgerSource = { type: 'ledgerCode', id: 'expense:food' };
const ruleSource = { type: 'rule', id: 'rule-2' };
const debtSource = { type: 'debtAccount', id: 'debt-1' };

function parseRules(rules: unknown[]) {
  return ProjectionRulesSchema.safeParse(rules);
}

describe('RETIREMENT_ASSUMPTION_BOUNDS', () => {
  it('exposes the five field ranges as the single source', () => {
    expect(Object.keys(RETIREMENT_ASSUMPTION_BOUNDS).sort()).toEqual(
      ['annualReturnRate', 'birthYear', 'inflationRate', 'lifeExpectancy', 'retirementAge'].sort(),
    );
    expect(RETIREMENT_ASSUMPTION_BOUNDS.retirementAge).toEqual({
      min: 1,
      max: 120,
    });
    expect(RETIREMENT_ASSUMPTION_BOUNDS.lifeExpectancy).toEqual({
      min: 1,
      max: Number.POSITIVE_INFINITY,
    });
    expect(RETIREMENT_ASSUMPTION_BOUNDS.inflationRate).toEqual({
      min: -0.1,
      max: 0.2,
    });
    expect(RETIREMENT_ASSUMPTION_BOUNDS.annualReturnRate).toEqual({
      min: -0.5,
      max: 0.3,
    });
  });
});

describe('assumptions', () => {
  it('parses the full valid group', () => {
    const result = parseAssumptions();
    expect(result.success).toBe(true);
  });

  it.each([
    ['birthYear', 1899, RetirementSchemaErrorCode.OUT_OF_RANGE],
    ['birthYear', 2027, RetirementSchemaErrorCode.OUT_OF_RANGE],
    ['birthYear', 1990.5, RetirementSchemaErrorCode.NOT_INTEGER],
    ['retirementAge', 0, RetirementSchemaErrorCode.OUT_OF_RANGE],
    ['retirementAge', 121, RetirementSchemaErrorCode.OUT_OF_RANGE],
    ['retirementAge', 60.5, RetirementSchemaErrorCode.NOT_INTEGER],
    ['lifeExpectancy', 0, RetirementSchemaErrorCode.OUT_OF_RANGE],
    ['lifeExpectancy', 85.5, RetirementSchemaErrorCode.NOT_INTEGER],
    ['inflationRate', -0.1001, RetirementSchemaErrorCode.OUT_OF_RANGE],
    ['inflationRate', 0.2001, RetirementSchemaErrorCode.OUT_OF_RANGE],
    ['inflationRate', 0.12345, RetirementSchemaErrorCode.TOO_MANY_DECIMAL_PLACES],
    ['annualReturnRate', -0.5001, RetirementSchemaErrorCode.OUT_OF_RANGE],
    ['annualReturnRate', 0.3001, RetirementSchemaErrorCode.OUT_OF_RANGE],
    ['annualReturnRate', 0.12345, RetirementSchemaErrorCode.TOO_MANY_DECIMAL_PLACES],
  ])('rejects %s = %s', (field, value, code) => {
    const result = parseAssumptions({ [field]: value });
    expect(codes(result)).toContain(code);
    expect(issueWith(result, code)?.path).toContain(field);
  });

  it.each([
    ['birthYear', 1900, { retirementAge: 100, lifeExpectancy: 130 }],
    ['birthYear', CURRENT_YEAR, {}],
    ['retirementAge', 1, {}],
    ['retirementAge', 120, { lifeExpectancy: 130 }],
    ['inflationRate', -0.1, {}],
    ['inflationRate', 0.2, {}],
    ['inflationRate', 0.1234, {}],
    ['annualReturnRate', -0.5, {}],
    ['annualReturnRate', 0.3, {}],
    ['annualReturnRate', 0.1234, {}],
  ])('accepts %s = %s', (field, value, crossChecks) => {
    const result = parseAssumptions({
      [field]: value,
      ...(crossChecks as Record<string, unknown>),
    });
    expect(result.success).toBe(true);
  });

  it('accepts lifeExpectancy at the numeric bounds where cross-checks allow', () => {
    expect(
      parseAssumptions({
        birthYear: CURRENT_YEAR,
        retirementAge: 1,
        lifeExpectancy: 2,
      }).success,
    ).toBe(true);
    expect(parseAssumptions({ retirementAge: 120, lifeExpectancy: 130 }).success).toBe(true);
    expect(parseAssumptions({ lifeExpectancy: 131 }).success).toBe(true);
  });

  it('requires lifeExpectancy to be greater than retirementAge', () => {
    const result = parseAssumptions({ retirementAge: 65, lifeExpectancy: 65 });
    expect(codes(result)).toContain(RetirementSchemaErrorCode.LIFE_EXPECTANCY_NOT_AFTER_RETIREMENT);
    expect(
      issueWith(result, RetirementSchemaErrorCode.LIFE_EXPECTANCY_NOT_AFTER_RETIREMENT)?.path,
    ).toEqual(['lifeExpectancy']);
  });

  it('requires lifeExpectancy to be at least the current age', () => {
    const result = parseAssumptions({
      birthYear: 1900,
      retirementAge: 60,
      lifeExpectancy: 125,
    });
    expect(codes(result)).toContain(RetirementSchemaErrorCode.LIFE_EXPECTANCY_BEFORE_CURRENT_AGE);
  });

  it('allows a birthYear equal to the current year', () => {
    expect(parseAssumptions({ birthYear: CURRENT_YEAR, retirementAge: 60 }).success).toBe(true);
  });

  it('allows an already retired person', () => {
    expect(
      parseAssumptions({ birthYear: 1960, retirementAge: 60, lifeExpectancy: 85 }).success,
    ).toBe(true);
  });

  it('rejects a current age above 130', () => {
    const result = createAssumptionsSchema(2031).safeParse(
      validAssumptions({ birthYear: 1900, retirementAge: 60, lifeExpectancy: 130 }),
    );
    expect(codes(result)).toContain(RetirementSchemaErrorCode.CURRENT_AGE_TOO_HIGH);
  });

  it('strips unknown keys', () => {
    const result = parseAssumptions({ currentAge: 36, extra: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty('currentAge');
      expect(result.data).not.toHaveProperty('extra');
    }
  });

  it('update schema omits and strips birthYear', () => {
    const schema = createAssumptionsUpdateSchema(CURRENT_YEAR, 1990);
    const result = schema.safeParse(validAssumptions({ birthYear: 2000 }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('birthYear');
  });

  it('update schema cross-checks against the stored birthYear anchor', () => {
    const result = createAssumptionsUpdateSchema(CURRENT_YEAR, 1900).safeParse({
      retirementAge: 60,
      lifeExpectancy: 125,
      inflationRate: 0.02,
      annualReturnRate: 0.05,
    });
    expect(codes(result)).toContain(RetirementSchemaErrorCode.LIFE_EXPECTANCY_BEFORE_CURRENT_AGE);
  });
});

describe('projection rule combinations', () => {
  it('income allows the four non-debt methods and rejects debtAmortization', () => {
    expect(ALLOWED_METHODS_BY_RULE_TYPE.income).toEqual([
      'inflation',
      'growthRate',
      'percentage',
      'fixedAmount',
    ]);
    expect(ALLOWED_METHODS_BY_RULE_TYPE.expense).toContain('debtAmortization');

    const result = ProjectionRulesSchema.safeParse([
      validRule({
        ruleType: 'income',
        method: 'debtAmortization',
        source: debtSource,
        parameters: {},
        endCondition: undefined,
      }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.METHOD_NOT_ALLOWED_FOR_RULE_TYPE);
  });

  it.each(['inflation', 'growthRate', 'percentage', 'fixedAmount'] as const)(
    'expense allows %s',
    (method) => {
      const source =
        method === 'fixedAmount' ? undefined : method === 'percentage' ? ruleSource : ledgerSource;
      const rules =
        method === 'percentage'
          ? [
              validRule({ id: 'rule-2' }),
              validRule({
                method,
                source,
                parameters:
                  method === 'percentage'
                    ? { ratio: 0.5 }
                    : method === 'growthRate'
                      ? { rate: 0.02 }
                      : {},
                baselinePolicy: method === 'fixedAmount' ? undefined : 'previousCompleteYear',
              }),
            ]
          : [
              validRule({
                method,
                source,
                parameters:
                  method === 'growthRate'
                    ? { rate: 0.02 }
                    : method === 'fixedAmount'
                      ? { amount: 100 }
                      : {},
                baselinePolicy: method === 'fixedAmount' ? undefined : 'previousCompleteYear',
              }),
            ];
      expect(parseRules(rules).success).toBe(true);
    },
  );

  it('expense allows debtAmortization', () => {
    expect(
      parseRules([
        validRule({
          method: 'debtAmortization',
          source: debtSource,
          parameters: {},
          endCondition: undefined,
        }),
      ]).success,
    ).toBe(true);
  });

  it.each(['inflation', 'growthRate', 'percentage'] as const)('%s requires a source', (method) => {
    const result = parseRules([
      validRule({
        method,
        parameters:
          method === 'percentage' ? { ratio: 0.5 } : method === 'growthRate' ? { rate: 0.02 } : {},
        baselinePolicy: method === 'percentage' ? undefined : 'previousCompleteYear',
      }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.SOURCE_REQUIRED);
  });

  it('debtAmortization requires a source', () => {
    const result = parseRules([
      validRule({
        method: 'debtAmortization',
        parameters: {},
        endCondition: undefined,
      }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.SOURCE_REQUIRED);
  });

  it('fixedAmount forbids a source', () => {
    const result = parseRules([validRule({ source: ledgerSource })]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.SOURCE_FORBIDDEN);
    expect(issueWith(result, RetirementSchemaErrorCode.SOURCE_FORBIDDEN)?.path).toEqual([
      0,
      'source',
    ]);
  });

  it('percentage requires a rule source', () => {
    const result = parseRules([
      validRule({ method: 'percentage', source: ledgerSource, parameters: { ratio: 0.5 } }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.PERCENTAGE_SOURCE_MUST_BE_RULE);
  });

  it('debtAmortization requires a debtAccount source', () => {
    const result = parseRules([
      validRule({
        method: 'debtAmortization',
        source: ledgerSource,
        parameters: {},
        endCondition: undefined,
      }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.DEBT_SOURCE_MUST_BE_DEBT_ACCOUNT);
  });

  it('references may cross ruleType', () => {
    expect(
      parseRules([
        validRule({ id: 'income-1', ruleType: 'income' }),
        validRule({
          id: 'expense-1',
          method: 'percentage',
          source: { type: 'rule', id: 'income-1' },
          parameters: { ratio: 0.5 },
        }),
      ]).success,
    ).toBe(true);
  });

  it('references may point at disabled rules', () => {
    const result = parseRules([
      validRule({ id: 'disabled-1', enabled: false }),
      validRule({
        method: 'percentage',
        source: { type: 'rule', id: 'disabled-1' },
        parameters: { ratio: 0.5 },
      }),
    ]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0].enabled).toBe(false);
  });

  it('rejects a self reference', () => {
    const result = parseRules([
      validRule({
        id: 'self',
        method: 'percentage',
        source: { type: 'rule', id: 'self' },
        parameters: { ratio: 0.5 },
      }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.SELF_REFERENCE);
  });

  it('rejects a dangling reference', () => {
    const result = parseRules([
      validRule({
        method: 'percentage',
        source: { type: 'rule', id: 'missing' },
        parameters: { ratio: 0.5 },
      }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.DANGLING_REFERENCE);
  });

  it('rejects a cycle with the full cycle path', () => {
    const result = parseRules([
      validRule({
        id: 'a',
        method: 'percentage',
        source: { type: 'rule', id: 'b' },
        parameters: { ratio: 0.5 },
      }),
      validRule({
        id: 'b',
        method: 'percentage',
        source: { type: 'rule', id: 'c' },
        parameters: { ratio: 0.5 },
      }),
      validRule({
        id: 'c',
        method: 'percentage',
        source: { type: 'rule', id: 'a' },
        parameters: { ratio: 0.5 },
      }),
    ]);
    const issue = issueWith(result, RetirementSchemaErrorCode.CYCLE);
    expect(issue?.params).toEqual({ ruleIds: ['a', 'b', 'c', 'a'] });
  });

  it('still detects cycles through disabled rules', () => {
    const result = parseRules([
      validRule({
        id: 'a',
        enabled: false,
        method: 'percentage',
        source: { type: 'rule', id: 'b' },
        parameters: { ratio: 0.5 },
      }),
      validRule({
        id: 'b',
        method: 'percentage',
        source: { type: 'rule', id: 'a' },
        parameters: { ratio: 0.5 },
      }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.CYCLE);
  });

  it.each([
    [RetirementSchemaErrorCode.RULE_ID_REQUIRED, { id: '  ' }],
    [RetirementSchemaErrorCode.RULE_NAME_REQUIRED, { name: '  ' }],
  ])('requires %s', (code, overrides) => {
    expect(codes(parseRules([validRule(overrides)]))).toContain(code);
  });

  it('trims names and defaults enabled to true', () => {
    const result = parseRules([validRule({ name: '  Name  ' })]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].name).toBe('Name');
      expect(result.data[0].enabled).toBe(true);
    }
  });

  it('preserves ids even when array order changes', () => {
    const result = parseRules([validRule({ id: 'second-id' }), validRule({ id: 'first-id' })]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((rule) => rule.id)).toEqual(['second-id', 'first-id']);
    }
  });
});

describe('baselinePolicy', () => {
  it.each(['inflation', 'growthRate'] as const)(
    '%s with a non-rule source requires a baseline policy',
    (method) => {
      const result = parseRules([
        validRule({
          method,
          source: ledgerSource,
          parameters: method === 'growthRate' ? { rate: 0.02 } : {},
        }),
      ]);
      expect(codes(result)).toContain(RetirementSchemaErrorCode.BASELINE_POLICY_REQUIRED);
    },
  );

  it.each(['inflation', 'growthRate'] as const)(
    '%s with a rule source forbids a baseline policy',
    (method) => {
      const result = parseRules([
        validRule({ id: 'base' }),
        validRule({
          method,
          source: { type: 'rule', id: 'base' },
          parameters: method === 'growthRate' ? { rate: 0.02 } : {},
          baselinePolicy: 'previousCompleteYear',
        }),
      ]);
      expect(codes(result)).toContain(RetirementSchemaErrorCode.BASELINE_POLICY_FORBIDDEN);
    },
  );

  it('rejects an unknown baseline policy value', () => {
    const result = parseRules([
      validRule({ method: 'inflation', source: ledgerSource, baselinePolicy: 'nextYear' }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.BASELINE_POLICY_INVALID);
  });

  it('accepts both baseline policy values', () => {
    expect(
      parseRules([
        validRule({
          method: 'inflation',
          source: ledgerSource,
          baselinePolicy: 'previousCompleteYear',
        }),
      ]).success,
    ).toBe(true);
    expect(
      parseRules([
        validRule({
          method: 'inflation',
          source: ledgerSource,
          baselinePolicy: 'specificYear',
          baselineYear: 1999,
        }),
      ]).success,
    ).toBe(true);
  });

  it.each(['percentage', 'fixedAmount', 'debtAmortization'] as const)(
    'strips baselinePolicy from %s',
    (method) => {
      const source =
        method === 'fixedAmount'
          ? undefined
          : method === 'debtAmortization'
            ? debtSource
            : ruleSource;
      const rules =
        method === 'percentage'
          ? [
              validRule({ id: 'rule-2' }),
              validRule({
                method,
                source,
                parameters: { ratio: 0.5 },
                baselinePolicy: 'specificYear',
              }),
            ]
          : [
              validRule({
                method,
                source,
                parameters: method === 'fixedAmount' ? { amount: 1 } : {},
                baselinePolicy: 'specificYear',
                ...(method === 'debtAmortization' ? { endCondition: undefined } : {}),
              }),
            ];
      const result = parseRules(rules);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.at(-1)).not.toHaveProperty('baselinePolicy');
    },
  );

  it('requires a baseline year for specificYear baseline policy', () => {
    expect(
      parseRules([
        validRule({ method: 'inflation', source: ledgerSource, baselinePolicy: 'specificYear' }),
      ]).success,
    ).toBe(false);
    expect(
      parseRules([
        validRule({
          method: 'inflation',
          source: ledgerSource,
          baselinePolicy: 'specificYear',
          baselineYear: 1999,
        }),
      ]).success,
    ).toBe(true);
  });
});

describe('endCondition', () => {
  it.each(['inflation', 'growthRate', 'percentage', 'fixedAmount'] as const)(
    '%s requires an endCondition',
    (method) => {
      const source =
        method === 'fixedAmount' ? undefined : method === 'percentage' ? ruleSource : ledgerSource;
      const result = parseRules([
        validRule({
          method,
          source,
          endCondition: undefined,
          parameters:
            method === 'percentage'
              ? { ratio: 0.5 }
              : method === 'growthRate'
                ? { rate: 0.02 }
                : method === 'fixedAmount'
                  ? { amount: 1 }
                  : {},
          baselinePolicy:
            method === 'inflation' || method === 'growthRate' ? 'previousCompleteYear' : undefined,
        }),
      ]);
      expect(codes(result)).toContain(RetirementSchemaErrorCode.END_CONDITION_REQUIRED);
    },
  );

  it('forbids endCondition on debtAmortization', () => {
    const result = parseRules([
      validRule({
        method: 'debtAmortization',
        source: debtSource,
        parameters: {},
        endCondition: { type: 'lifelong' },
      }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.END_CONDITION_FORBIDDEN);
  });

  it.each([
    [{ type: 'specificAge', age: 0 }, RetirementSchemaErrorCode.SPECIFIC_AGE_OUT_OF_RANGE],
    [{ type: 'specificAge', age: 131 }, RetirementSchemaErrorCode.SPECIFIC_AGE_OUT_OF_RANGE],
    [{ type: 'specificAge', age: 60.5 }, RetirementSchemaErrorCode.SPECIFIC_AGE_OUT_OF_RANGE],
    [{ type: 'specificAge', age: 1 }, undefined],
    [{ type: 'specificAge', age: 130 }, undefined],
    [{ type: 'specificYear', year: 1899 }, RetirementSchemaErrorCode.SPECIFIC_YEAR_OUT_OF_RANGE],
    [{ type: 'specificYear', year: 2201 }, RetirementSchemaErrorCode.SPECIFIC_YEAR_OUT_OF_RANGE],
    [{ type: 'specificYear', year: 1900 }, undefined],
    [{ type: 'specificYear', year: 2200 }, undefined],
    [{ type: 'retirementYearExclusive' }, undefined],
    [{ type: 'lifelong' }, undefined],
  ])('validates %j', (endCondition, code) => {
    const result = parseRules([validRule({ endCondition })]);
    if (code) expect(codes(result)).toContain(code);
    else expect(result.success).toBe(true);
  });

  it('rejects an unknown endCondition type', () => {
    const result = parseRules([validRule({ endCondition: { type: 'forever' } })]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.END_CONDITION_INVALID);
  });
});

describe('keepsPaceWithInflation', () => {
  it.each([
    ['fixedAmount', undefined, { amount: 1 }, undefined],
    ['percentage', ruleSource, { ratio: 0.5 }, undefined],
    ['growthRate', ledgerSource, { rate: 0.02 }, 'previousCompleteYear'],
    ['inflation', ledgerSource, {}, 'previousCompleteYear'],
  ] as const)('is allowed on %s', (method, source, parameters, baselinePolicy) => {
    const target = validRule({ id: 'rule-2', ruleType: 'income' });
    const result = parseRules([
      target,
      validRule({
        method,
        source,
        parameters,
        baselinePolicy,
        keepsPaceWithInflation: true,
      }),
    ]);
    expect(result.success).toBe(true);
  });

  it('is forbidden on debtAmortization', () => {
    const result = parseRules([
      validRule({
        method: 'debtAmortization',
        source: debtSource,
        parameters: {},
        endCondition: undefined,
        keepsPaceWithInflation: true,
      }),
    ]);
    expect(codes(result)).toContain(RetirementSchemaErrorCode.KEEPS_PACE_WITH_INFLATION_FORBIDDEN);
  });

  it('defaults to false when absent', () => {
    const result = parseRules([validRule()]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0].keepsPaceWithInflation).toBe(false);
  });
});

describe('parameters', () => {
  it.each([
    [-0.1, true],
    [0.2, true],
    [0.1234, true],
    [-0.1001, false],
    [0.2001, false],
    [0.12345, false],
  ])('growthRate rate %s valid=%s', (rate, valid) => {
    const result = parseRules([
      validRule({
        method: 'growthRate',
        source: ledgerSource,
        parameters: { rate },
        baselinePolicy: 'previousCompleteYear',
      }),
    ]);
    expect(result.success).toBe(valid);
    if (!valid) {
      expect(
        codes(result).some((code) =>
          [
            RetirementSchemaErrorCode.PARAMETER_OUT_OF_RANGE,
            RetirementSchemaErrorCode.PARAMETER_TOO_MANY_DECIMAL_PLACES,
          ].includes(code as never),
        ),
      ).toBe(true);
    }
  });

  it.each([
    [0, RetirementSchemaErrorCode.PARAMETER_NOT_POSITIVE],
    [-1, RetirementSchemaErrorCode.PARAMETER_NOT_POSITIVE],
    [2.0001, RetirementSchemaErrorCode.PARAMETER_OUT_OF_RANGE],
    [0.12345, RetirementSchemaErrorCode.PARAMETER_TOO_MANY_DECIMAL_PLACES],
  ])('percentage ratio %s emits %s', (ratio, code) => {
    const result = parseRules([
      validRule({ id: 'rule-2' }),
      validRule({
        method: 'percentage',
        source: ruleSource,
        parameters: { ratio },
      }),
    ]);
    expect(codes(result)).toContain(code);
  });

  it.each([0.0001, 0.5, 2])('percentage ratio %s is valid', (ratio) => {
    const result = parseRules([
      validRule({ id: 'rule-2' }),
      validRule({
        method: 'percentage',
        source: ruleSource,
        parameters: { ratio },
      }),
    ]);
    expect(result.success).toBe(true);
  });

  it('accepts zero and rejects negative fixedAmount', () => {
    expect(parseRules([validRule({ parameters: { amount: 0 } })]).success).toBe(true);
    expect(codes(parseRules([validRule({ parameters: { amount: -1 } })]))).toContain(
      RetirementSchemaErrorCode.AMOUNT_NEGATIVE,
    );
  });

  it('strips unknown parameter keys', () => {
    const result = parseRules([validRule({ parameters: { amount: 1, extra: true } })]);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data[0].parameters).toEqual({ amount: 1 });
  });
});

function validEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-1',
    name: 'Move house',
    type: 'expense',
    phases: [{ startYear: 2030, endYear: 2031, amount: 1000 }],
    ...overrides,
  };
}

describe('life events', () => {
  it('parses a valid event and defaults enabled', () => {
    const result = LifeEventSchema.safeParse(validEvent());
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.enabled).toBe(true);
  });

  it('allows any income/expense direction without a source', () => {
    expect(LifeEventSchema.safeParse(validEvent({ type: 'income' })).success).toBe(true);
    expect(validEvent()).not.toHaveProperty('source');
  });

  it.each([
    ['id', '  ', RetirementSchemaErrorCode.EVENT_ID_REQUIRED],
    ['name', '  ', RetirementSchemaErrorCode.EVENT_NAME_REQUIRED],
    ['phases', [], RetirementSchemaErrorCode.PHASES_REQUIRED],
  ])('rejects %s = %j', (field, value, code) => {
    expect(codes(LifeEventSchema.safeParse(validEvent({ [field]: value })))).toContain(code);
  });

  it('trims the event name', () => {
    const result = LifeEventSchema.safeParse(validEvent({ name: '  Name  ' }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Name');
  });

  it('allows an absent phase name but rejects a blank one', () => {
    expect(
      LifeEventSchema.safeParse(
        validEvent({ phases: [{ startYear: 2030, endYear: 2030, amount: 1 }] }),
      ).success,
    ).toBe(true);
    expect(
      codes(
        LifeEventSchema.safeParse(
          validEvent({
            phases: [{ name: '  ', startYear: 2030, endYear: 2030, amount: 1 }],
          }),
        ),
      ),
    ).toContain(RetirementSchemaErrorCode.PHASE_NAME_BLANK);
  });

  it.each([
    [1899, 1900],
    [2200, 2201],
  ])('rejects phase years %s..%s out of range', (startYear, endYear) => {
    expect(
      codes(LifeEventSchema.safeParse(validEvent({ phases: [{ startYear, endYear, amount: 1 }] }))),
    ).toContain(RetirementSchemaErrorCode.PHASE_YEAR_OUT_OF_RANGE);
  });

  it('accepts phase year boundaries', () => {
    expect(
      LifeEventSchema.safeParse(
        validEvent({ phases: [{ startYear: 1900, endYear: 1900, amount: 0 }] }),
      ).success,
    ).toBe(true);
    expect(
      LifeEventSchema.safeParse(
        validEvent({ phases: [{ startYear: 2200, endYear: 2200, amount: 0 }] }),
      ).success,
    ).toBe(true);
  });

  it('rejects an end year before the start year', () => {
    expect(
      codes(
        LifeEventSchema.safeParse(
          validEvent({ phases: [{ startYear: 2031, endYear: 2030, amount: 1 }] }),
        ),
      ),
    ).toContain(RetirementSchemaErrorCode.PHASE_END_BEFORE_START);
  });

  it('rejects unsorted phases', () => {
    const result = LifeEventSchema.safeParse(
      validEvent({
        phases: [
          { startYear: 2035, endYear: 2036, amount: 1 },
          { startYear: 2030, endYear: 2030, amount: 1 },
        ],
      }),
    );
    expect(codes(result)).toContain(RetirementSchemaErrorCode.PHASES_NOT_SORTED);
  });

  it('rejects overlapping phases with the phase index and year', () => {
    const result = LifeEventSchema.safeParse(
      validEvent({
        phases: [
          { startYear: 2030, endYear: 2035, amount: 1 },
          { startYear: 2035, endYear: 2036, amount: 1 },
        ],
      }),
    );
    const issue = issueWith(result, RetirementSchemaErrorCode.PHASES_OVERLAP);
    expect(issue?.params).toEqual({ phaseIndex: 1, year: 2035 });
    expect(issue?.path).toEqual([1, 'startYear']);
  });

  it('allows adjacent non-overlapping phases', () => {
    expect(
      LifeEventSchema.safeParse(
        validEvent({
          phases: [
            { startYear: 2030, endYear: 2030, amount: 1 },
            { startYear: 2031, endYear: 2031, amount: 1 },
          ],
        }),
      ).success,
    ).toBe(true);
  });

  it('rejects a negative amount', () => {
    expect(
      codes(
        LifeEventSchema.safeParse(
          validEvent({ phases: [{ startYear: 2030, endYear: 2030, amount: -1 }] }),
        ),
      ),
    ).toContain(RetirementSchemaErrorCode.AMOUNT_NEGATIVE);
  });

  it.each([
    [-0.1001, RetirementSchemaErrorCode.GROWTH_RATE_OUT_OF_RANGE],
    [0.2001, RetirementSchemaErrorCode.GROWTH_RATE_OUT_OF_RANGE],
    [0.12345, RetirementSchemaErrorCode.GROWTH_RATE_TOO_MANY_DECIMAL_PLACES],
  ])('rejects growthRate %s', (growthRate, code) => {
    expect(
      codes(
        LifeEventSchema.safeParse(
          validEvent({
            phases: [{ startYear: 2030, endYear: 2030, amount: 1, growthRate }],
          }),
        ),
      ),
    ).toContain(code);
  });

  it('accepts growthRate at both bounds', () => {
    for (const growthRate of [-0.1, 0.2]) {
      expect(
        LifeEventSchema.safeParse(
          validEvent({
            phases: [{ startYear: 2030, endYear: 2030, amount: 1, growthRate }],
          }),
        ).success,
      ).toBe(true);
    }
  });

  it('strips unknown keys', () => {
    const result = LifeEventSchema.safeParse(validEvent({ source: { type: 'rule' } }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('source');
  });
});

function validPlan(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Plan',
    assumptions: validAssumptions(),
    projectionRules: [validRule()],
    lifeEvents: [validEvent()],
    createdBy: 'user-1',
    updatedBy: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('plan schemas', () => {
  it('parses a create document and strips unknown keys', () => {
    const result = createRetirementPlanCreateSchema(CURRENT_YEAR).safeParse(
      validPlan({ extra: true }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('extra');
  });

  it('requires a non-blank name', () => {
    const result = createRetirementPlanCreateSchema(CURRENT_YEAR).safeParse(
      validPlan({ name: '   ' }),
    );
    expect(codes(result)).toContain(RetirementSchemaErrorCode.NAME_REQUIRED);
  });

  it('limits the name to 100 characters', () => {
    const result = createRetirementPlanCreateSchema(CURRENT_YEAR).safeParse(
      validPlan({ name: 'a'.repeat(101) }),
    );
    expect(codes(result)).toContain(RetirementSchemaErrorCode.NAME_TOO_LONG);
  });

  it('trims the plan name', () => {
    const result = createRetirementPlanCreateSchema(CURRENT_YEAR).safeParse(
      validPlan({ name: '  Plan  ' }),
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe('Plan');
  });

  it('accepts ISO timestamps for audit fields', () => {
    const result = createRetirementPlanCreateSchema(CURRENT_YEAR).safeParse(
      validPlan({
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    expect(result.success).toBe(true);
  });

  it('requires assumptions, rules and events', () => {
    const result = createRetirementPlanCreateSchema(CURRENT_YEAR).safeParse({
      name: 'Plan',
      createdBy: 'u',
      updatedBy: 'u',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const messages = codes(result).map((code) => code.toLowerCase());
    expect(messages.join(' ')).toContain('invalid');
  });

  it('update schema omits birthYear and strips a supplied one', () => {
    const result = createRetirementPlanUpdateSchema(CURRENT_YEAR, 1990).safeParse(
      validPlan({ assumptions: validAssumptions({ birthYear: 2000 }) }),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assumptions).not.toHaveProperty('birthYear');
    }
  });

  it('update schema uses the anchor for currentAge checks', () => {
    const result = createRetirementPlanUpdateSchema(CURRENT_YEAR, 1900).safeParse(
      validPlan({
        assumptions: {
          retirementAge: 60,
          lifeExpectancy: 125,
          inflationRate: 0.02,
          annualReturnRate: 0.05,
        },
      }),
    );
    expect(codes(result)).toContain(RetirementSchemaErrorCode.LIFE_EXPECTANCY_BEFORE_CURRENT_AGE);
  });
});

describe('rule graph integration in the rules schema', () => {
  it('sorts a valid graph through the shared resolver', () => {
    const rules = [
      validRule({ id: 'a' }),
      validRule({
        id: 'b',
        method: 'percentage',
        source: { type: 'rule', id: 'a' },
        parameters: { ratio: 0.5 },
      }),
    ];
    expect(parseRules(rules).success).toBe(true);
    expect(resolveRuleGraph(rules)).toEqual({ ok: true, order: ['a', 'b'] });
  });
});
