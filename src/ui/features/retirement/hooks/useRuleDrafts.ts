import { useCallback, useMemo } from 'react';

import { type Resolver, type ResolverResult, useForm } from 'react-hook-form';

import {
  ALLOWED_METHODS_BY_RULE_TYPE,
  type ProjectionRule,
  ProjectionRuleSchema,
  ProjectionRulesSchema,
  type RuleMethod,
  type RuleSourceType,
  type RuleType,
} from '@/domains/retirement/projectionRules';
import { type ValidationOutcome } from '@/ui/features/retirement/viewmodels/formValidation';
import {
  type RuleDraftVM,
  type RuleErrorsById,
  RuleFormSchema,
  type RulesForm,
  blankRule,
  collectRuleErrors,
  mapRuleToVM,
  mapRuleVMToDomain,
  needsBaselinePolicy,
} from '@/ui/features/retirement/viewmodels/ruleForm.vm';

export type {
  RuleDraftVM,
  RuleErrors,
  RuleErrorsById,
  RuleMethod,
  RuleSourceType,
  RuleType,
} from '@/ui/features/retirement/viewmodels/ruleForm.vm';

const DEFAULT_METHOD: RuleMethod = 'inflation';

export function useRuleDrafts(markDirty: () => void) {
  const resolver = useCallback<Resolver<RulesForm>>((values): ResolverResult<RulesForm> => {
    const parsed = RuleFormSchema.safeParse(values);
    if (parsed.success) return { values, errors: {} };

    const fieldErrors: Record<string, Record<string, { type: string; message: string }>> = {};
    for (const issue of parsed.error.issues) {
      const [index, field] = issue.path;
      if (typeof index !== 'number' || typeof field !== 'string') continue;
      if (!values.rules[index]?.touched) continue;

      fieldErrors[index] ??= {};
      fieldErrors[index][field] ??= { type: 'validation', message: issue.message };
    }

    if (Object.keys(fieldErrors).length === 0) return { values, errors: {} };
    return { values, errors: { rules: fieldErrors } } as unknown as ResolverResult<RulesForm>;
  }, []);

  const form = useForm<RulesForm>({ mode: 'onTouched', defaultValues: { rules: [] }, resolver });
  const rules = form.watch('rules');

  const commit = useCallback(
    (next: RuleDraftVM[]) => {
      form.reset({ rules: next } as never);
      markDirty();
    },
    [form, markDirty],
  );

  const update = useCallback(
    (id: string, patch: Partial<RuleDraftVM>) => {
      commit(
        form
          .getValues('rules')
          .map((rule) => (rule.id === id ? { ...rule, ...patch, touched: true } : rule)),
      );
    },
    [commit, form],
  );

  const add = useCallback(
    (ruleType: RuleType) => commit([...form.getValues('rules'), blankRule(ruleType)]),
    [commit, form],
  );

  const remove = useCallback(
    (id: string) => commit(form.getValues('rules').filter((rule) => rule.id !== id)),
    [commit, form],
  );

  const toggle = useCallback(
    (id: string) => {
      commit(
        form
          .getValues('rules')
          .map((rule) =>
            rule.id === id ? { ...rule, enabled: !rule.enabled, touched: true } : rule,
          ),
      );
    },
    [commit, form],
  );

  /** A method switch drops parameters by construction and realigns the source. */
  const setMethod = useCallback(
    (id: string, method: RuleMethod) => {
      commit(
        form.getValues('rules').map((rule) => {
          if (rule.id !== id) return rule;

          const reset: Partial<RuleDraftVM> = {
            method,
            rateText: '',
            ratioText: '',
            amountText: '',
            baselinePolicy: '',
            baselineYearText: '',
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
    },
    [commit, form],
  );

  const setRuleType = useCallback(
    (id: string, ruleType: RuleType) => {
      commit(
        form.getValues('rules').map((rule) => {
          if (rule.id !== id) return rule;
          const allowed = ALLOWED_METHODS_BY_RULE_TYPE[ruleType];
          if (allowed.includes(rule.method)) return { ...rule, ruleType, touched: true };
          return { ...rule, ruleType, method: DEFAULT_METHOD, touched: true };
        }),
      );
    },
    [commit, form],
  );

  const setSourceType = useCallback(
    (id: string, sourceType: RuleSourceType) => {
      commit(
        form.getValues('rules').map((rule) =>
          rule.id === id
            ? {
                ...rule,
                sourceType,
                sourceId: '',
                baselinePolicy: needsBaselinePolicy(rule.method, sourceType)
                  ? rule.baselinePolicy
                  : '',
                baselineYearText: needsBaselinePolicy(rule.method, sourceType)
                  ? rule.baselineYearText
                  : '',
                touched: true,
              }
            : rule,
        ),
      );
    },
    [commit, form],
  );

  const validate = useCallback((): ValidationOutcome<ProjectionRule[], RuleErrorsById> => {
    const current = form.getValues('rules');
    const errors = collectRuleErrors(current);
    const built = current.map((rule) => {
      const parsed = ProjectionRuleSchema.safeParse(mapRuleVMToDomain(rule));
      return parsed.success ? parsed.data : mapRuleVMToDomain(rule);
    });
    const all = ProjectionRulesSchema.safeParse(built);

    void form.trigger();
    return {
      ok: Object.keys(errors).length === 0 && all.success,
      data: all.success ? all.data : undefined,
      errors,
    };
  }, [form]);

  const visibleErrors = useMemo(() => {
    const all = collectRuleErrors(rules);
    const visible: RuleErrorsById = {};
    for (const rule of rules) {
      if (rule.touched && all[rule.id]) visible[rule.id] = all[rule.id];
    }
    return visible;
  }, [rules]);

  const replaceAll = useCallback(
    (next: ProjectionRule[]) => {
      form.reset({ rules: next.map(mapRuleToVM) });
    },
    [form],
  );

  /** CALCULATE reveals every rule error, not only the touched rows. */
  const revealAll = useCallback(() => {
    form.setValue(
      'rules',
      form.getValues('rules').map((rule) => ({ ...rule, touched: true })),
      { shouldDirty: true, shouldTouch: true },
    );
    void form.trigger();
  }, [form]);

  return {
    form,
    rules,
    errors: visibleErrors,
    valid: Object.keys(collectRuleErrors(rules)).length === 0,
    add,
    revealAll,
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
