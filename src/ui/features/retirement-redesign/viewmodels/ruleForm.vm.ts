import { z } from 'zod';

import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';
import {
  type BaselinePolicy,
  type EndCondition,
  type ProjectionRule,
  ProjectionRuleSchema,
  ProjectionRulesSchema,
  type RuleMethod,
  type RuleSourceType,
  type RuleType,
} from '@/domains/retirement/projectionRules';
import { newId } from '@/shared/id';
import { ASSUMPTION_LABELS } from '@/ui/constants/retirement-redesign/setupLabels';
import { RETIREMENT_VALIDATION_LABELS } from '@/ui/constants/retirement/retirementValidationLabels';

import { decimalToPercentText, percentToDecimal } from './assumptionForm.vm';

export type { RuleMethod, RuleSourceType, RuleType } from '@/domains/retirement/projectionRules';
export { ALLOWED_METHODS_BY_RULE_TYPE } from '@/domains/retirement/projectionRules';

export type EndConditionType = EndCondition['type'];

export type RuleErrorField =
  | 'name'
  | 'ruleType'
  | 'method'
  | 'sourceType'
  | 'sourceId'
  | 'parameter'
  | 'endCondition'
  | 'endAge'
  | 'endYear'
  | 'baselinePolicy'
  | 'baselineYear';

export const RuleDraftFormSchema = z.object({
  id: z.string(),
  name: z.string(),
  ruleType: z.enum(['income', 'expense']),
  method: z.enum(['inflation', 'growthRate', 'percentage', 'fixedAmount', 'debtAmortization']),
  enabled: z.boolean(),
  sourceType: z.enum(['ledgerCode', 'rule', 'debtAccount', '']),
  sourceId: z.string(),
  rateText: z.string(),
  ratioText: z.string(),
  amountText: z.string(),
  endConditionType: z.enum(['retirementYearExclusive', 'specificAge', 'specificYear', 'lifelong']),
  endAge: z.string(),
  endYear: z.string(),
  baselinePolicy: z.enum(['previousCompleteYear', 'specificYear', '']),
  baselineYearText: z.string(),
  touched: z.boolean(),
});

export type RuleDraftVM = z.infer<typeof RuleDraftFormSchema>;

export type RuleErrors = Partial<Record<RuleErrorField, string>>;
export type RuleErrorsById = Record<string, RuleErrors>;

export const RulesFormSchema = z.object({ rules: z.array(RuleDraftFormSchema) });

export type RulesForm = z.infer<typeof RulesFormSchema>;

const DEFAULT_METHOD: RuleMethod = 'inflation';

export function blankRule(ruleType: RuleType): RuleDraftVM {
  return {
    id: newId(),
    name: '',
    ruleType,
    method: DEFAULT_METHOD,
    enabled: true,
    sourceType: 'ledgerCode',
    sourceId: '',
    rateText: '',
    ratioText: '',
    amountText: '',
    endConditionType: 'retirementYearExclusive',
    endAge: '',
    endYear: '',
    baselinePolicy: '',
    baselineYearText: '',
    touched: false,
  };
}

export function hasSource(method: RuleMethod): boolean {
  return method !== 'fixedAmount';
}

export function needsBaselinePolicy(method: RuleMethod, sourceType: RuleSourceType | ''): boolean {
  return (method === 'inflation' || method === 'growthRate') && sourceType !== 'rule';
}

export function needsBaselineYear(baselinePolicy: BaselinePolicy | ''): boolean {
  return baselinePolicy === 'specificYear';
}

function parseNumber(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}

function labelFor(code: string, message: string): string {
  const known = RETIREMENT_VALIDATION_LABELS[message as RetirementSchemaErrorCode];
  if (known !== undefined) return known;
  if (code === 'invalid_type') return ASSUMPTION_LABELS.INVALID_NUMBER;
  return ASSUMPTION_LABELS.INVALID_NUMBER;
}

function buildEndCondition(rule: RuleDraftVM): EndCondition {
  switch (rule.endConditionType) {
    case 'specificAge':
      return { type: 'specificAge', age: parseNumber(rule.endAge) };
    case 'specificYear':
      return { type: 'specificYear', year: parseNumber(rule.endYear) };
    case 'lifelong':
      return { type: 'lifelong' };
    default:
      return { type: 'retirementYearExclusive' };
  }
}

function baselineFields(rule: RuleDraftVM): {
  baselinePolicy?: BaselinePolicy;
  baselineYear?: number;
} {
  if (!needsBaselinePolicy(rule.method, rule.sourceType)) return {};
  if (rule.baselinePolicy === '') return {};
  if (rule.baselinePolicy === 'specificYear') {
    return {
      baselinePolicy: rule.baselinePolicy,
      baselineYear: parseNumber(rule.baselineYearText),
    };
  }
  return { baselinePolicy: rule.baselinePolicy };
}

/** VM -> domain payload. Unknown keys stay permissive for the domain parse. */
export function mapRuleVMToDomain(rule: RuleDraftVM): unknown {
  const shared = {
    id: rule.id,
    name: rule.name,
    ruleType: rule.ruleType,
    enabled: rule.enabled,
    method: rule.method,
  };
  const source = { type: rule.sourceType as RuleSourceType, id: rule.sourceId };

  switch (rule.method) {
    case 'fixedAmount':
      return {
        ...shared,
        parameters: { amount: parseNumber(rule.amountText) },
        endCondition: buildEndCondition(rule),
      };
    case 'debtAmortization':
      return { ...shared, source, parameters: {} };
    case 'percentage':
      return {
        ...shared,
        source,
        parameters: { ratio: percentToDecimal(rule.ratioText) },
        endCondition: buildEndCondition(rule),
      };
    case 'growthRate':
      return {
        ...shared,
        source,
        parameters: { rate: percentToDecimal(rule.rateText) },
        endCondition: buildEndCondition(rule),
        ...baselineFields(rule),
      };
    default:
      return {
        ...shared,
        source,
        parameters: {},
        endCondition: buildEndCondition(rule),
        ...baselineFields(rule),
      };
  }
}

export function mapRuleToVM(rule: ProjectionRule): RuleDraftVM {
  return {
    id: rule.id,
    name: rule.name,
    ruleType: rule.ruleType,
    method: rule.method,
    enabled: rule.enabled,
    sourceType: rule.source?.type ?? '',
    sourceId: rule.source?.id ?? '',
    rateText:
      rule.parameters && 'rate' in rule.parameters
        ? decimalToPercentText(rule.parameters.rate)
        : '',
    ratioText:
      rule.parameters && 'ratio' in rule.parameters
        ? decimalToPercentText(rule.parameters.ratio)
        : '',
    amountText:
      rule.parameters && 'amount' in rule.parameters ? String(rule.parameters.amount) : '',
    endConditionType: rule.endCondition?.type ?? 'retirementYearExclusive',
    endAge: rule.endCondition?.type === 'specificAge' ? String(rule.endCondition.age) : '',
    endYear: rule.endCondition?.type === 'specificYear' ? String(rule.endCondition.year) : '',
    baselinePolicy:
      typeof rule.baselinePolicy === 'string' ? (rule.baselinePolicy as BaselinePolicy) : '',
    baselineYearText: rule.baselineYear === undefined ? '' : String(rule.baselineYear),
    touched: false,
  };
}

function mapIssuePath(path: (string | number | symbol)[]): RuleErrorField | undefined {
  const [head, second] = path;
  if (head === 'source') return second === 'type' ? 'sourceType' : 'sourceId';
  if (head === 'endCondition') {
    if (second === 'age') return 'endAge';
    if (second === 'year') return 'endYear';
    return 'endCondition';
  }
  if (head === 'parameters') return 'parameter';
  switch (head) {
    case 'name':
      return 'name';
    case 'ruleType':
      return 'ruleType';
    case 'method':
      return 'method';
    case 'baselinePolicy':
      return 'baselinePolicy';
    case 'baselineYear':
      return 'baselineYear';
    default:
      return undefined;
  }
}

/** Per-rule field errors, keyed by rule id. First label per field wins. */
export function collectRuleErrors(rules: RuleDraftVM[]): RuleErrorsById {
  const errors: RuleErrorsById = {};
  const parsedById = rules.map((rule) => ProjectionRuleSchema.safeParse(mapRuleVMToDomain(rule)));
  const built: unknown[] = [];

  for (const [index, parsed] of parsedById.entries()) {
    const rule = rules[index];
    if (parsed.success) {
      built.push(parsed.data);
      continue;
    }
    const rowErrors: RuleErrors = {};
    for (const issue of parsed.error.issues) {
      const field = mapIssuePath(issue.path);
      if (field !== undefined && rowErrors[field] === undefined) {
        rowErrors[field] = labelFor(issue.code, issue.message);
      }
    }
    errors[rule.id] = rowErrors;
    built.push(mapRuleVMToDomain(rule));
  }

  const all = ProjectionRulesSchema.safeParse(built);
  if (!all.success) {
    for (const issue of all.error.issues) {
      const index = issue.path[0];
      if (typeof index !== 'number') continue;
      const rule = rules[index];
      if (rule === undefined) continue;
      const field = mapIssuePath(issue.path.slice(1));
      if (field !== undefined && errors[rule.id]?.[field] === undefined) {
        errors[rule.id] = {
          ...errors[rule.id],
          [field]: labelFor(issue.code, issue.message),
        };
      }
    }
  }

  return errors;
}

/**
 * Form VM gate. Semantic rules stay in the domain schemas; the refinement only
 * re-attributes their issues to `[ruleIndex, field]` so the resolver and the
 * submit gate share one parse.
 */
export const RuleFormSchema = RulesFormSchema.superRefine((value, ctx) => {
  const errors = collectRuleErrors(value.rules);

  for (const [index, rule] of value.rules.entries()) {
    const rowErrors = errors[rule.id];
    if (rowErrors === undefined) continue;
    for (const [field, message] of Object.entries(rowErrors)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, field],
        message,
      });
    }
  }
});
