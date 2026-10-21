import { useCallback, useMemo, useState } from 'react';

import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';
import {
  ALLOWED_METHODS_BY_RULE_TYPE,
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
import {
  decimalToPercentText,
  percentToDecimal,
} from '@/ui/features/retirement-redesign/hooks/useAssumptionDraft';
import { type ValidationOutcome } from '@/ui/features/retirement-redesign/hooks/useAssumptionDraft';

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
  | 'baselinePolicy';

export interface RuleDraftVM {
  id: string;
  name: string;
  ruleType: RuleType;
  method: RuleMethod;
  enabled: boolean;
  sourceType: RuleSourceType | '';
  sourceId: string;
  rateText: string;
  ratioText: string;
  amountText: string;
  endConditionType: EndConditionType;
  endAge: string;
  endYear: string;
  baselinePolicy: BaselinePolicy | '';
  touched: boolean;
}

export type RuleErrors = Partial<Record<RuleErrorField, string>>;
export type RuleErrorsById = Record<string, RuleErrors>;

const DEFAULT_METHOD: RuleMethod = 'inflation';

function blankRule(ruleType: RuleType): RuleDraftVM {
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
    touched: false,
  };
}

export function hasSource(method: RuleMethod): boolean {
  return method !== 'fixedAmount';
}

export function needsBaselinePolicy(method: RuleMethod, sourceType: RuleSourceType | ''): boolean {
  return (method === 'inflation' || method === 'growthRate') && sourceType !== 'rule';
}

function parseNumber(text: string): number {
  return text.trim() === '' ? Number.NaN : Number(text);
}

function labelFor(code: string, message: string): string {
  if (code === 'invalid_type') return ASSUMPTION_LABELS.INVALID_NUMBER;
  if (code !== 'custom') return ASSUMPTION_LABELS.INVALID_NUMBER;
  return RETIREMENT_VALIDATION_LABELS[message as RetirementSchemaErrorCode] ?? 'Invalid value';
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

function buildRule(rule: RuleDraftVM): unknown {
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
        ...(needsBaselinePolicy(rule.method, rule.sourceType) && rule.baselinePolicy !== ''
          ? { baselinePolicy: rule.baselinePolicy }
          : {}),
      };
    default:
      return {
        ...shared,
        source,
        parameters: {},
        endCondition: buildEndCondition(rule),
        ...(needsBaselinePolicy(rule.method, rule.sourceType) && rule.baselinePolicy !== ''
          ? { baselinePolicy: rule.baselinePolicy }
          : {}),
      };
  }
}

function fieldForPath(path: (string | number | symbol)[]): RuleErrorField | undefined {
  const first = path[0];
  if (typeof first !== 'string') return undefined;
  if (first in TARGET_FIELD) return TARGET_FIELD[first];
  if (first === 'parameters') return 'parameter';
  return undefined;
}

const TARGET_FIELD: Record<string, RuleErrorField> = {
  name: 'name',
  ruleType: 'ruleType',
  method: 'method',
  source: 'sourceId',
  endCondition: 'endCondition',
  baselinePolicy: 'baselinePolicy',
};

function mapIssuePath(
  path: (string | number | symbol)[],
  rule: RuleDraftVM,
): RuleErrorField | undefined {
  const [head, second] = path;
  if (head === 'source') return second === 'type' ? 'sourceType' : 'sourceId';
  if (head === 'endCondition') {
    if (second === 'age') return 'endAge';
    if (second === 'year') return 'endYear';
    return 'endCondition';
  }
  if (head === 'parameters') {
    if (rule.method === 'growthRate') return 'parameter';
    if (rule.method === 'percentage') return 'parameter';
    return 'parameter';
  }
  return fieldForPath(path);
}

function ruleFromDomain(rule: ProjectionRule): RuleDraftVM {
  const ruleWithOptionals = rule as ProjectionRule & {
    baselinePolicy?: BaselinePolicy;
    endCondition?: EndCondition;
    parameters?: { rate?: number; ratio?: number; amount?: number };
  };

  return {
    id: rule.id,
    name: rule.name,
    ruleType: rule.ruleType,
    method: rule.method,
    enabled: rule.enabled,
    sourceType: rule.source?.type ?? '',
    sourceId: rule.source?.id ?? '',
    rateText:
      ruleWithOptionals.parameters?.rate === undefined
        ? ''
        : decimalToPercentText(ruleWithOptionals.parameters.rate),
    ratioText:
      ruleWithOptionals.parameters?.ratio === undefined
        ? ''
        : decimalToPercentText(ruleWithOptionals.parameters.ratio),
    amountText:
      ruleWithOptionals.parameters?.amount === undefined
        ? ''
        : String(ruleWithOptionals.parameters.amount),
    endConditionType: ruleWithOptionals.endCondition?.type ?? 'retirementYearExclusive',
    endAge:
      ruleWithOptionals.endCondition?.type === 'specificAge'
        ? String(ruleWithOptionals.endCondition.age)
        : '',
    endYear:
      ruleWithOptionals.endCondition?.type === 'specificYear'
        ? String(ruleWithOptionals.endCondition.year)
        : '',
    baselinePolicy: ruleWithOptionals.baselinePolicy ?? '',
    touched: false,
  };
}

export function useRuleDrafts(markDirty: () => void) {
  const [rules, setRules] = useState<RuleDraftVM[]>([]);

  const update = useCallback(
    (id: string, patch: Partial<RuleDraftVM>) => {
      setRules((current) =>
        current.map((rule) => (rule.id === id ? { ...rule, ...patch, touched: true } : rule)),
      );
      markDirty();
    },
    [markDirty],
  );

  const add = useCallback(
    (ruleType: RuleType) => {
      setRules((current) => [...current, blankRule(ruleType)]);
      markDirty();
    },
    [markDirty],
  );

  const remove = useCallback(
    (id: string) => {
      setRules((current) => current.filter((rule) => rule.id !== id));
      markDirty();
    },
    [markDirty],
  );

  const toggle = useCallback(
    (id: string) => {
      setRules((current) =>
        current.map((rule) =>
          rule.id === id ? { ...rule, enabled: !rule.enabled, touched: true } : rule,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  /** A method switch drops parameters by construction and realigns the source. */
  const setMethod = useCallback(
    (id: string, method: RuleMethod) => {
      setRules((current) =>
        current.map((rule) => {
          if (rule.id !== id) return rule;

          const reset: Partial<RuleDraftVM> = {
            method,
            rateText: '',
            ratioText: '',
            amountText: '',
            baselinePolicy: '',
            endAge: '',
            endYear: '',
            endConditionType: 'retirementYearExclusive',
            touched: true,
          };

          if (method === 'fixedAmount') {
            return { ...rule, ...reset, sourceType: '', sourceId: '' };
          }
          if (method === 'debtAmortization') {
            return { ...rule, ...reset, sourceType: 'debtAccount', sourceId: '' };
          }
          if (method === 'percentage') {
            return { ...rule, ...reset, sourceType: 'rule', sourceId: '' };
          }
          const sourceType = rule.sourceType === 'debtAccount' ? 'ledgerCode' : rule.sourceType;
          return {
            ...rule,
            ...reset,
            sourceType: sourceType || 'ledgerCode',
            sourceId: rule.sourceType === 'debtAccount' ? '' : rule.sourceId,
          };
        }),
      );
      markDirty();
    },
    [markDirty],
  );

  const setRuleType = useCallback(
    (id: string, ruleType: RuleType) => {
      setRules((current) =>
        current.map((rule) => {
          if (rule.id !== id) return rule;
          const allowed = ALLOWED_METHODS_BY_RULE_TYPE[ruleType];
          if (allowed.includes(rule.method)) return { ...rule, ruleType, touched: true };
          return { ...rule, ruleType, method: DEFAULT_METHOD, touched: true };
        }),
      );
      markDirty();
    },
    [markDirty],
  );

  const setSourceType = useCallback(
    (id: string, sourceType: RuleSourceType) => {
      setRules((current) =>
        current.map((rule) =>
          rule.id === id
            ? {
                ...rule,
                sourceType,
                sourceId: '',
                baselinePolicy: needsBaselinePolicy(rule.method, sourceType)
                  ? rule.baselinePolicy
                  : '',
                touched: true,
              }
            : rule,
        ),
      );
      markDirty();
    },
    [markDirty],
  );

  const validate = useCallback((): ValidationOutcome<ProjectionRule[], RuleErrorsById> => {
    const errors: RuleErrorsById = {};
    const parsedById = rules.map((rule) => ProjectionRuleSchema.safeParse(buildRule(rule)));
    const built: unknown[] = [];

    for (const [index, parsed] of parsedById.entries()) {
      const rule = rules[index];
      if (parsed.success) {
        built.push(parsed.data);
        continue;
      }
      const rowErrors: RuleErrors = {};
      for (const issue of parsed.error.issues) {
        const field = mapIssuePath(issue.path, rule);
        if (field !== undefined && rowErrors[field] === undefined) {
          rowErrors[field] = labelFor(issue.code, issue.message);
        }
      }
      errors[rule.id] = rowErrors;
      built.push(buildRule(rule));
    }

    const all = ProjectionRulesSchema.safeParse(built);
    if (all.success) return { ok: Object.keys(errors).length === 0, data: all.data, errors };

    for (const issue of all.error.issues) {
      const index = issue.path[0];
      if (typeof index !== 'number') continue;
      const rule = rules[index];
      if (rule === undefined) continue;
      const field = mapIssuePath(issue.path.slice(1), rule);
      if (field !== undefined && errors[rule.id]?.[field] === undefined) {
        errors[rule.id] = {
          ...errors[rule.id],
          [field]: labelFor(issue.code, issue.message),
        };
      }
    }

    return { ok: false, errors };
  }, [rules]);

  const validation = useMemo(() => validate(), [validate]);

  const visibleErrors = useMemo(() => {
    const visible: RuleErrorsById = {};
    for (const rule of rules) {
      if (rule.touched && validation.errors[rule.id]) visible[rule.id] = validation.errors[rule.id];
    }
    return visible;
  }, [rules, validation.errors]);

  const replaceAll = useCallback((next: ProjectionRule[]) => {
    setRules(next.map(ruleFromDomain));
  }, []);

  return {
    rules,
    errors: visibleErrors,
    valid: validation.ok,
    add,
    remove,
    toggle,
    update,
    setMethod,
    setRuleType,
    setSourceType,
    validate,
    replaceAll,
  };
}
