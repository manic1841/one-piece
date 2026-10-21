import { useState } from 'react';

import { type UseFormReturn } from 'react-hook-form';

import { PageSection } from '@/ui/components/PageSection';
import { Form, SelectField } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { RULE_LABELS, RULE_TYPE_LABELS } from '@/ui/constants/retirement-redesign/setupLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { ProjectionRuleRow } from '@/ui/features/retirement-redesign/components/ProjectionRuleRow';
import { type DebtAccountOption } from '@/ui/features/retirement-redesign/hooks/useDebtAccountOptions';
import {
  type RuleDraftVM,
  type RuleErrorsById,
  type RuleMethod,
  type RuleSourceType,
  type RuleType,
} from '@/ui/features/retirement-redesign/hooks/useRuleDrafts';

interface RulesFormValue {
  rules: RuleDraftVM[];
}

interface ProjectionRulesSectionProps {
  form: UseFormReturn<RulesFormValue>;
  rules: RuleDraftVM[];
  errors: RuleErrorsById;
  readOnly: boolean;
  ledgerCodes: LedgerCodeItem[];
  debtAccounts: DebtAccountOption[];
  add: (ruleType: RuleType) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  update: (id: string, patch: Partial<RuleDraftVM>) => void;
  setRuleType: (id: string, ruleType: RuleType) => void;
  setMethod: (id: string, method: RuleMethod) => void;
  setSourceType: (id: string, sourceType: RuleSourceType) => void;
}

/** The rule list, its add entry, and the row-error summary at the block bottom. */
export function ProjectionRulesSection({
  form,
  rules,
  errors,
  readOnly,
  ledgerCodes,
  debtAccounts,
  add,
  remove,
  toggle,
  update,
  setRuleType,
  setMethod,
  setSourceType,
}: ProjectionRulesSectionProps) {
  const [newRuleType, setNewRuleType] = useState<RuleType>('income');

  const ledgerOptions = ledgerCodes.map((code) => ({ value: code.code, label: code.label }));
  const debtOptions = debtAccounts.map((account) => ({
    value: account.id,
    label: account.name,
  }));

  const ruleOptionsFor = (ruleId: string) =>
    rules
      .filter((candidate) => candidate.id !== ruleId)
      .map((candidate) => ({
        value: candidate.id,
        label: candidate.name.trim() || RULE_LABELS.UNNAMED_RULE,
      }));

  const rowErrors = Object.entries(errors).flatMap(([ruleId, fields]) => {
    const rule = rules.find((candidate) => candidate.id === ruleId);
    const name = rule?.name.trim() || RULE_LABELS.UNNAMED_RULE;
    return Object.values(fields).map((message) => `${name}：${message}`);
  });

  return (
    <Form {...form}>
      <PageSection
        number="02"
        title={PROJECTION_WORKSPACE_LABELS.RULES_SECTION}
        spacing="compact"
        action={
          !readOnly && (
            <div className="flex items-end gap-2">
              <SelectField
                aria-label={RULE_LABELS.RULE_TYPE}
                value={newRuleType}
                onChange={(value) => setNewRuleType(value as RuleType)}
                options={Object.entries(RULE_TYPE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                className="w-28"
              />
              <Button variant="outline" size="sm" onClick={() => add(newRuleType)}>
                {RULE_LABELS.ADD}
              </Button>
            </div>
          )
        }
      >
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground">{RULE_LABELS.EMPTY}</p>
        ) : (
          <ul className="grid gap-4">
            {rules.map((rule, index) => (
              <ProjectionRuleRow
                key={rule.id}
                index={index}
                rule={rule}
                readOnly={readOnly}
                ledgerOptions={ledgerOptions}
                ruleOptions={ruleOptionsFor(rule.id)}
                debtOptions={debtOptions}
                errors={errors[rule.id] ?? {}}
                update={(patch) => update(rule.id, patch)}
                setRuleType={(ruleType) => setRuleType(rule.id, ruleType)}
                setMethod={(method) => setMethod(rule.id, method)}
                setSourceType={(sourceType) => setSourceType(rule.id, sourceType)}
                toggle={() => toggle(rule.id)}
                remove={() => remove(rule.id)}
              />
            ))}
          </ul>
        )}

        {rowErrors.length > 0 && (
          <ul className="mt-3 space-y-1" data-testid="rule-error-summary">
            {rowErrors.map((message, index) => (
              <li key={`${message}-${index}`} className="text-destructive text-sm font-medium">
                {message}
              </li>
            ))}
          </ul>
        )}
      </PageSection>
    </Form>
  );
}
