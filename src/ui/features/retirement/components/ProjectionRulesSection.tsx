import { useState } from 'react';

import { type UseFormReturn } from 'react-hook-form';

import { PageSection } from '@/ui/components/PageSection';
import { eyebrowClass } from '@/ui/components/eyebrow';
import { type ComboboxOption, Form } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { RULE_LABELS } from '@/ui/constants/retirement/setupLabels';
import { WORKSPACE_SECTION_LABELS } from '@/ui/constants/retirement/workspaceRailLabels';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { ProjectionRuleDialog } from '@/ui/features/retirement/components/ProjectionRuleDialog';
import { ProjectionRuleInspector } from '@/ui/features/retirement/components/ProjectionRuleInspector';
import { ProjectionRuleRow } from '@/ui/features/retirement/components/ProjectionRuleRow';
import { type DebtAccountOption } from '@/ui/features/retirement/hooks/useDebtAccountOptions';
import {
  type RuleDraftVM,
  type RuleErrorsById,
  type RuleMethod,
  type RuleSourceType,
  type RuleType,
  type RulesForm as RulesFormValue,
} from '@/ui/features/retirement/viewmodels/ruleForm.vm';

interface ProjectionRulesSectionProps {
  form: UseFormReturn<RulesFormValue>;
  rules: RuleDraftVM[];
  errors: RuleErrorsById;
  readOnly: boolean;
  ledgerCodes: LedgerCodeItem[];
  debtAccounts: DebtAccountOption[];
  /** Returns the new draft's id so the section can select it. */
  add: (ruleType: RuleType) => string | null;
  remove: (id: string) => void;
  /** Restores a whole draft by id, used when a dialog edit is cancelled. */
  replace: (id: string, draft: RuleDraftVM) => void;
  toggle: (id: string) => void;
  update: (id: string, patch: Partial<RuleDraftVM>) => void;
  setRuleType: (id: string, ruleType: RuleType) => void;
  setMethod: (id: string, method: RuleMethod) => void;
  setSourceType: (id: string, sourceType: RuleSourceType) => void;
}

const GROUPS: ReadonlyArray<{
  side: RuleType;
  label: string;
  emptyLabel: string;
}> = [
  {
    side: 'income',
    label: WORKSPACE_SECTION_LABELS.INCOME,
    emptyLabel: WORKSPACE_SECTION_LABELS.EMPTY_INCOME,
  },
  {
    side: 'expense',
    label: WORKSPACE_SECTION_LABELS.EXPENSE,
    emptyLabel: WORKSPACE_SECTION_LABELS.EMPTY_EXPENSE,
  },
];

/**
 * Both sides share one band and one ADD: the side is a field on the rule, so two
 * ADD buttons only said the same thing twice. Rows summarise; clicking one opens
 * the dialog that owns every field, and a new rule only reaches the list once it
 * is confirmed — cancelling drops it, so a click never leaves a blank row behind.
 */
export function ProjectionRulesSection({
  form,
  rules,
  errors,
  readOnly,
  ledgerCodes,
  debtAccounts,
  add,
  remove,
  replace,
  toggle,
  update,
  setRuleType,
  setMethod,
  setSourceType,
}: ProjectionRulesSectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    mode: 'create' | 'edit';
    /** Untouched copy restored when an existing rule is cancelled. */
    snapshot: RuleDraftVM | null;
  } | null>(null);

  // `form.reset` can expose a transient hole between two rapid adds.
  const list = rules.filter((rule): rule is RuleDraftVM => rule !== undefined);
  const editingRule = editing === null ? null : (list.find((r) => r.id === editing.id) ?? null);
  const editingIndex = editingRule === null ? -1 : list.indexOf(editingRule);

  const startCreate = () => {
    const id = add('income');
    if (id === null) return;
    setSelectedId(id);
    setEditing({ id, mode: 'create', snapshot: null });
  };

  const startEdit = (rule: RuleDraftVM) => {
    setSelectedId(rule.id);
    setEditing({ id: rule.id, mode: 'edit', snapshot: { ...rule } });
  };

  const cancel = () => {
    if (editing === null) return;
    if (editing.mode === 'create') remove(editing.id);
    else if (editing.snapshot !== null) replace(editing.id, editing.snapshot);
    setSelectedId(editing.mode === 'create' ? null : editing.id);
    setEditing(null);
  };

  const deleteEditing = () => {
    if (editing === null) return;
    remove(editing.id);
    setSelectedId(null);
    setEditing(null);
  };

  const debtOptions = debtAccounts.map((account) => ({ value: account.id, label: account.name }));

  // The open picker hides the list behind itself, so hand it the two facts that
  // used to be readable on the page: who already uses a code, and how many are left.
  const usageByCode = new Map<string, number>();
  for (const rule of list) {
    if (rule.sourceType !== 'ledgerCode' || rule.sourceId === '') continue;
    usageByCode.set(rule.sourceId, (usageByCode.get(rule.sourceId) ?? 0) + 1);
  }

  const ledgerOptionsFor = (ruleId: string): ComboboxOption[] =>
    ledgerCodes.map((code) => {
      const others = list.filter(
        (rule) =>
          rule.id !== ruleId && rule.sourceType === 'ledgerCode' && rule.sourceId === code.code,
      );
      const hint =
        others.length === 0
          ? undefined
          : RULE_LABELS.SOURCE_USED_BY.replace('{count}', String(others.length));
      return {
        value: code.code,
        label: code.label,
        hint,
        group: others.length === 0 ? RULE_LABELS.SOURCE_UNUSED : RULE_LABELS.SOURCE_IN_USE,
      };
    });

  const unassignedCount = ledgerCodes.filter((code) => !usageByCode.has(code.code)).length;

  const ruleOptionsFor = (ruleId: string): ComboboxOption[] =>
    list
      .filter((candidate) => candidate.id !== ruleId)
      .map((candidate) => ({
        value: candidate.id,
        label: (candidate.name ?? '').trim() || RULE_LABELS.UNNAMED_RULE,
      }));

  return (
    <Form {...form}>
      <PageSection
        number={WORKSPACE_SECTION_LABELS.NUMBER_RULES}
        title={WORKSPACE_SECTION_LABELS.RULES}
        action={
          !readOnly && (
            <Button variant="text" size="sm" className="shrink-0" onClick={startCreate}>
              {RULE_LABELS.ADD}
            </Button>
          )
        }
      >
        <div className="grid gap-8">
          {GROUPS.map(({ side, label, emptyLabel }) => {
            const sideRules = list
              .map((rule) => ({ rule }))
              .filter((entry) => entry.rule.ruleType === side);
            const errorCount = sideRules.filter(
              (entry) => errors[entry.rule.id] !== undefined,
            ).length;

            return (
              <div key={side} className="grid gap-3">
                <div className="flex items-center gap-3">
                  <p className={eyebrowClass}>{label}</p>
                  <span className={eyebrowClass} data-testid={`${side}-rule-status`}>
                    {sideRules.length}
                    {errorCount > 0 && ` · ${errorCount} WARNING`}
                  </span>
                </div>

                {sideRules.length === 0 ? (
                  <p className="text-muted-foreground text-[13px]">{emptyLabel}</p>
                ) : (
                  <ul className="grid gap-1">
                    {sideRules.map(({ rule }) => (
                      <ProjectionRuleRow
                        key={rule.id}
                        rule={rule}
                        selected={rule.id === selectedId}
                        errorCount={Object.keys(errors[rule.id] ?? {}).length}
                        onSelect={() => startEdit(rule)}
                      />
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          {editingRule !== null && editingIndex >= 0 && (
            <ProjectionRuleDialog
              open={editing !== null}
              mode={editing?.mode ?? 'edit'}
              title={
                editing?.mode === 'create'
                  ? editingRule.ruleType === 'expense'
                    ? RULE_LABELS.NEW_TITLE_EXPENSE
                    : RULE_LABELS.NEW_TITLE
                  : RULE_LABELS.EDIT_TITLE
              }
              readOnly={readOnly}
              confirmDisabled={(editingRule.name ?? '').trim() === ''}
              onConfirm={() => setEditing(null)}
              onCancel={cancel}
              onDelete={deleteEditing}
            >
              <ProjectionRuleInspector
                rule={editingRule}
                index={editingIndex}
                readOnly={readOnly}
                ledgerOptions={ledgerOptionsFor(editingRule.id)}
                debtOptions={debtOptions}
                ruleOptions={ruleOptionsFor(editingRule.id)}
                unassignedCount={unassignedCount}
                errors={errors[editingRule.id] ?? {}}
                update={(patch) => update(editingRule.id, patch)}
                setRuleType={(ruleType) => setRuleType(editingRule.id, ruleType)}
                setMethod={(method) => setMethod(editingRule.id, method)}
                setSourceType={(sourceType) => setSourceType(editingRule.id, sourceType)}
                toggle={() => toggle(editingRule.id)}
              />
            </ProjectionRuleDialog>
          )}
        </div>
      </PageSection>
    </Form>
  );
}
