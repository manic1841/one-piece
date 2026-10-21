import { z } from 'zod';

import { RetirementSchemaErrorCode } from './errorCodes';
import { resolveRuleGraph } from './logic/ruleGraph';
import { addIssue, decimalField } from './numeric';

export const RuleType = z.enum(['income', 'expense']);
export type RuleType = z.infer<typeof RuleType>;

export const RuleMethod = z.enum([
  'inflation',
  'growthRate',
  'percentage',
  'fixedAmount',
  'debtAmortization',
]);
export type RuleMethod = z.infer<typeof RuleMethod>;

/** The single method × ruleType combination table. There is no `debt` side. */
export const ALLOWED_METHODS_BY_RULE_TYPE: Record<RuleType, RuleMethod[]> = {
  income: ['inflation', 'growthRate', 'percentage', 'fixedAmount'],
  expense: ['inflation', 'growthRate', 'percentage', 'fixedAmount', 'debtAmortization'],
};

export const RuleSourceType = z.enum(['ledgerCode', 'rule', 'debtAccount']);
export type RuleSourceType = z.infer<typeof RuleSourceType>;

export interface RuleSource {
  type: RuleSourceType;
  id: string;
}

export type BaselinePolicy = 'previousCompleteYear' | 'specificYear';
export const BaselinePolicy = z.enum(['previousCompleteYear', 'specificYear']);

export const EndConditionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('retirementYearExclusive') }),
  z.object({ type: z.literal('specificAge'), age: z.number() }).superRefine((value, ctx) => {
    if (!Number.isInteger(value.age) || value.age < 1 || value.age > 130) {
      addIssue(ctx, RetirementSchemaErrorCode.SPECIFIC_AGE_OUT_OF_RANGE, ['age'], {
        min: 1,
        max: 130,
      });
    }
  }),
  z.object({ type: z.literal('specificYear'), year: z.number() }).superRefine((value, ctx) => {
    if (!Number.isInteger(value.year) || value.year < 1900 || value.year > 2200) {
      addIssue(ctx, RetirementSchemaErrorCode.SPECIFIC_YEAR_OUT_OF_RANGE, ['year'], {
        min: 1900,
        max: 2200,
      });
    }
  }),
  z.object({ type: z.literal('lifelong') }),
]);
export type EndCondition = z.infer<typeof EndConditionSchema>;

const ratioSchema = decimalField(0, 2, {
  minExclusive: true,
  belowCode: RetirementSchemaErrorCode.PARAMETER_NOT_POSITIVE,
  aboveCode: RetirementSchemaErrorCode.PARAMETER_OUT_OF_RANGE,
  tooManyCode: RetirementSchemaErrorCode.PARAMETER_TOO_MANY_DECIMAL_PLACES,
});

const rateSchema = decimalField(-0.1, 0.2, {
  belowCode: RetirementSchemaErrorCode.PARAMETER_OUT_OF_RANGE,
  aboveCode: RetirementSchemaErrorCode.PARAMETER_OUT_OF_RANGE,
  tooManyCode: RetirementSchemaErrorCode.PARAMETER_TOO_MANY_DECIMAL_PLACES,
});

const amountSchema = z.number().superRefine((value, ctx) => {
  if (value < 0) {
    addIssue(ctx, RetirementSchemaErrorCode.AMOUNT_NEGATIVE, [], { min: 0 });
  }
});

const parameterSchemaByMethod = {
  inflation: z.object({}),
  growthRate: z.object({ rate: rateSchema }),
  percentage: z.object({ ratio: ratioSchema }),
  fixedAmount: z.object({ amount: amountSchema }),
  debtAmortization: z.object({}),
} satisfies Record<RuleMethod, z.ZodTypeAny>;

interface BranchOptions {
  method: RuleMethod;
  hasSource: boolean;
  requiresEndCondition: boolean;
  hasBaselinePolicy: boolean;
  validateSource?: (source: RuleSource, ctx: z.RefinementCtx) => void;
  validateBaseline?: (
    source: RuleSource,
    baselinePolicy: BaselinePolicy | undefined,
    baselineYear: number | undefined,
    ctx: z.RefinementCtx,
  ) => void;
}

const baseShape = {
  id: z.string().trim().min(1, RetirementSchemaErrorCode.RULE_ID_REQUIRED),
  name: z.string().trim().min(1, RetirementSchemaErrorCode.RULE_NAME_REQUIRED),
  ruleType: RuleType,
  enabled: z.boolean().default(true),
};

function validateSourceShape(source: unknown, ctx: z.RefinementCtx): RuleSource | undefined {
  if (source === undefined || source === null) {
    addIssue(ctx, RetirementSchemaErrorCode.SOURCE_REQUIRED, ['source']);
    return undefined;
  }
  if (typeof source !== 'object') {
    addIssue(ctx, RetirementSchemaErrorCode.SOURCE_INVALID, ['source']);
    return undefined;
  }

  const candidate = source as { type?: unknown; id?: unknown };
  if (!RuleSourceType.safeParse(candidate.type).success) {
    addIssue(ctx, RetirementSchemaErrorCode.SOURCE_INVALID, ['source', 'type']);
    return undefined;
  }
  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
    addIssue(ctx, RetirementSchemaErrorCode.SOURCE_ID_REQUIRED, ['source', 'id']);
    return undefined;
  }

  return { type: candidate.type as RuleSourceType, id: candidate.id };
}

function buildBranch(options: BranchOptions) {
  const {
    method,
    hasSource,
    requiresEndCondition,
    hasBaselinePolicy,
    validateSource,
    validateBaseline,
  } = options;

  const sourceField = hasSource
    ? z.unknown().transform((value) => value as RuleSource)
    : z.undefined({ error: RetirementSchemaErrorCode.SOURCE_FORBIDDEN }).optional();

  const endConditionField = requiresEndCondition
    ? z.unknown().transform((value) => value as EndCondition)
    : z
        .undefined({
          error: RetirementSchemaErrorCode.END_CONDITION_FORBIDDEN,
        })
        .optional();

  const baselinePolicyField = hasBaselinePolicy
    ? z
        .unknown()
        .optional()
        .transform((value) => value as BaselinePolicy | undefined)
    : undefined;
  const baselineYearField = hasBaselinePolicy
    ? z
        .unknown()
        .optional()
        .transform((value) => value as number | undefined)
    : undefined;

  const shape = {
    ...baseShape,
    method: z.literal(method),
    source: sourceField,
    parameters: parameterSchemaByMethod[method],
    endCondition: endConditionField,
    ...(baselinePolicyField ? { baselinePolicy: baselinePolicyField } : {}),
    ...(baselineYearField ? { baselineYear: baselineYearField } : {}),
  };

  return z.object(shape).superRefine((value, ctx) => {
    const allowed = ALLOWED_METHODS_BY_RULE_TYPE[value.ruleType];
    if (!allowed.includes(method)) {
      addIssue(ctx, RetirementSchemaErrorCode.METHOD_NOT_ALLOWED_FOR_RULE_TYPE, ['method'], {
        method,
        ruleType: value.ruleType,
        allowed,
      });
    }

    const source = hasSource ? validateSourceShape(value.source, ctx) : undefined;
    if (source) validateSource?.(source, ctx);

    if (requiresEndCondition) {
      if (value.endCondition === undefined) {
        addIssue(ctx, RetirementSchemaErrorCode.END_CONDITION_REQUIRED, ['endCondition']);
      } else {
        const parsed = EndConditionSchema.safeParse(value.endCondition);
        if (!parsed.success) addEndConditionIssues(ctx, parsed.error);
      }
    }

    if (hasBaselinePolicy) {
      validateBaseline?.(
        source as RuleSource,
        value.baselinePolicy as BaselinePolicy | undefined,
        value.baselineYear as number | undefined,
        ctx,
      );
    }
  });
}

function addEndConditionIssues(ctx: z.RefinementCtx, error: z.ZodError): void {
  const specific = error.issues.filter((issue) =>
    Object.values(RetirementSchemaErrorCode).includes(issue.message as RetirementSchemaErrorCode),
  );
  if (specific.length === 0) {
    addIssue(ctx, RetirementSchemaErrorCode.END_CONDITION_INVALID, ['endCondition']);
  }
  for (const issue of specific) {
    addIssue(
      ctx,
      issue.message,
      [
        'endCondition',
        ...issue.path.map((part) => (typeof part === 'symbol' ? String(part.description) : part)),
      ],
      (issue as { params?: Record<string, unknown> }).params,
    );
  }
}

const inflationBranch = buildBranch({
  method: 'inflation',
  hasSource: true,
  requiresEndCondition: true,
  hasBaselinePolicy: true,
  validateBaseline: validateBaselinePolicy,
});

const growthRateBranch = buildBranch({
  method: 'growthRate',
  hasSource: true,
  requiresEndCondition: true,
  hasBaselinePolicy: true,
  validateBaseline: validateBaselinePolicy,
});

const percentageBranch = buildBranch({
  method: 'percentage',
  hasSource: true,
  requiresEndCondition: true,
  hasBaselinePolicy: false,
  validateSource: (source, ctx) => {
    if (source.type !== 'rule') {
      addIssue(ctx, RetirementSchemaErrorCode.PERCENTAGE_SOURCE_MUST_BE_RULE, ['source', 'type'], {
        type: source.type,
      });
    }
  },
});

const fixedAmountBranch = buildBranch({
  method: 'fixedAmount',
  hasSource: false,
  requiresEndCondition: true,
  hasBaselinePolicy: false,
});

const debtAmortizationBranch = buildBranch({
  method: 'debtAmortization',
  hasSource: true,
  requiresEndCondition: false,
  hasBaselinePolicy: false,
  validateSource: (source, ctx) => {
    if (source.type !== 'debtAccount') {
      addIssue(
        ctx,
        RetirementSchemaErrorCode.DEBT_SOURCE_MUST_BE_DEBT_ACCOUNT,
        ['source', 'type'],
        { type: source.type },
      );
    }
  },
});

function validateBaselinePolicy(
  source: RuleSource | undefined,
  baselinePolicy: BaselinePolicy | undefined,
  baselineYear: number | undefined,
  ctx: z.RefinementCtx,
): void {
  if (source === undefined) return;

  if (source.type === 'rule') {
    if (baselinePolicy !== undefined) {
      addIssue(ctx, RetirementSchemaErrorCode.BASELINE_POLICY_FORBIDDEN, ['baselinePolicy'], {
        sourceType: source.type,
      });
    }
    if (baselineYear !== undefined) {
      addIssue(ctx, RetirementSchemaErrorCode.BASELINE_YEAR_FORBIDDEN, ['baselineYear']);
    }
    return;
  }

  if (baselinePolicy === undefined) {
    addIssue(ctx, RetirementSchemaErrorCode.BASELINE_POLICY_REQUIRED, ['baselinePolicy']);
    return;
  }

  if (!BaselinePolicy.safeParse(baselinePolicy).success) {
    addIssue(ctx, RetirementSchemaErrorCode.BASELINE_POLICY_INVALID, ['baselinePolicy']);
    return;
  }

  if (baselinePolicy === 'specificYear') {
    if (baselineYear === undefined) {
      addIssue(ctx, RetirementSchemaErrorCode.BASELINE_YEAR_REQUIRED, ['baselineYear']);
      return;
    }
    if (!Number.isInteger(baselineYear) || baselineYear < 1900 || baselineYear > 2200) {
      addIssue(ctx, RetirementSchemaErrorCode.BASELINE_YEAR_OUT_OF_RANGE, ['baselineYear'], {
        min: 1900,
        max: 2200,
      });
    }
    return;
  }

  if (baselineYear !== undefined) {
    addIssue(ctx, RetirementSchemaErrorCode.BASELINE_YEAR_FORBIDDEN, ['baselineYear']);
  }
}

export const ProjectionRuleSchema = z.discriminatedUnion('method', [
  inflationBranch,
  growthRateBranch,
  percentageBranch,
  fixedAmountBranch,
  debtAmortizationBranch,
]);
export type ProjectionRule = z.infer<typeof ProjectionRuleSchema>;

function ruleRef(rule: ProjectionRule): string | undefined {
  return rule.source?.type === 'rule' ? rule.source.id : undefined;
}

export const ProjectionRulesSchema = z.array(ProjectionRuleSchema).superRefine((rules, ctx) => {
  const indexById = new Map(rules.map((rule, index) => [rule.id, index]));

  for (const [index, rule] of rules.entries()) {
    const targetId = ruleRef(rule);
    if (targetId !== undefined && targetId === rule.id) {
      addIssue(ctx, RetirementSchemaErrorCode.SELF_REFERENCE, [index, 'source', 'id'], {
        ruleId: rule.id,
      });
    }
  }

  const graph = resolveRuleGraph(
    rules.map((rule) => ({
      id: rule.id,
      source: rule.source ? { type: rule.source.type, id: rule.source.id } : undefined,
    })),
  );

  if (graph.ok) return;

  for (const error of graph.errors) {
    if (error.code === 'DANGLING_REFERENCE') {
      addIssue(
        ctx,
        RetirementSchemaErrorCode.DANGLING_REFERENCE,
        [indexById.get(error.ruleId) ?? 0, 'source', 'id'],
        { ruleId: error.ruleId, targetId: error.targetId },
      );
      continue;
    }

    const isSelfCycle = error.ruleIds.length === 2 && error.ruleIds[0] === error.ruleIds[1];
    if (isSelfCycle) continue;

    addIssue(
      ctx,
      RetirementSchemaErrorCode.CYCLE,
      [indexById.get(error.ruleIds[0]) ?? 0, 'source', 'id'],
      { ruleIds: error.ruleIds },
    );
  }
});
