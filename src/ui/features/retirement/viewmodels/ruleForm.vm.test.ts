import { describe, expect, it } from 'vitest';

import { type ProjectionRule } from '@/domains/retirement/projectionRules';

import {
  RuleFormSchema,
  blankRule,
  collectRuleErrors,
  mapRuleToVM,
  mapRuleVMToDomain,
  needsBaselinePolicy,
} from './ruleForm.vm';

const ledgerRule: ProjectionRule = {
  id: 'rule-1',
  name: 'Salary',
  ruleType: 'income',
  enabled: true,
  source: { type: 'ledgerCode', id: 'code-1' },
  method: 'inflation',
  parameters: {},
  endCondition: { type: 'lifelong' },
  baselinePolicy: 'previousCompleteYear',
};

describe('ruleForm.vm', () => {
  it('round-trips a rule through the VM', () => {
    const vm = mapRuleToVM(ledgerRule);

    expect(vm.rateText).toBe('');
    expect(mapRuleVMToDomain(vm)).toEqual(ledgerRule);
  });

  it('converts guard, rate and baseline into a fixed amount payload', () => {
    const vm = {
      ...blankRule('expense'),
      method: 'fixedAmount' as const,
      amountText: '500',
    };

    expect(mapRuleVMToDomain(vm)).toMatchObject({
      parameters: { amount: 500 },
      endCondition: { type: 'retirementYearExclusive' },
    });
  });

  it('reports a self reference on the source id', () => {
    const vm = { ...mapRuleToVM(ledgerRule), method: 'percentage' as const, ratioText: '50' };
    vm.source = undefined as never;
    const selfReferencing = { ...vm, sourceType: 'rule' as const, sourceId: 'rule-1' };

    expect(collectRuleErrors([selfReferencing])['rule-1']).toEqual({
      sourceId: '規則不可參照自己',
    });
  });

  it('emits issues at the rule index and field', () => {
    const parsed = RuleFormSchema.safeParse({
      rules: [{ ...mapRuleToVM(ledgerRule), name: '' }],
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error!.issues[0]).toMatchObject({ path: [0, 'name'], message: '規則名稱必填' });
  });

  it('drops the baseline policy once the source is another rule', () => {
    expect(needsBaselinePolicy('inflation', 'rule')).toBe(false);
    expect(needsBaselinePolicy('inflation', 'ledgerCode')).toBe(true);
    expect(needsBaselinePolicy('fixedAmount', 'ledgerCode')).toBe(false);
  });
});
