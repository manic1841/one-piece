import { NumberInput } from '@/ui/components/NumberInput';
import { SelectField, type SelectFieldOption, TextInput } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Label } from '@/ui/components/ui/label';
import { Switch } from '@/ui/components/ui/switch';
import {
  BASELINE_POLICY_LABELS,
  END_CONDITION_LABELS,
  RULE_LABELS,
  RULE_METHOD_LABELS,
  RULE_TYPE_LABELS,
} from '@/ui/constants/retirement-redesign/setupLabels';
import {
  ALLOWED_METHODS_BY_RULE_TYPE,
  type RuleMethod,
  type RuleSourceType,
  type RuleType,
} from '@/ui/features/retirement-redesign/hooks/useRuleDrafts';
import {
  type RuleDraftVM,
  type RuleErrorField,
  type RuleErrors,
  hasSource,
  needsBaselinePolicy,
} from '@/ui/features/retirement-redesign/hooks/useRuleDrafts';

interface ProjectionRuleRowProps {
  rule: RuleDraftVM;
  errors: RuleErrors;
  readOnly: boolean;
  ledgerOptions: SelectFieldOption[];
  ruleOptions: SelectFieldOption[];
  debtOptions: SelectFieldOption[];
  update: (patch: Partial<RuleDraftVM>) => void;
  setRuleType: (ruleType: RuleType) => void;
  setMethod: (method: RuleMethod) => void;
  setSourceType: (sourceType: RuleSourceType) => void;
  toggle: () => void;
  remove: () => void;
}

const TYPE_OPTIONS: SelectFieldOption[] = Object.entries(RULE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const fieldId = (ruleId: string, field: string) => `rule-${ruleId}-${field}`;

function errorFor(errors: RuleErrors, field: RuleErrorField): string | undefined {
  return errors[field];
}

/**
 * One rule editor. Method drives the parameter, end-condition and source
 * branches, so only the fields that belong to the current union are mounted.
 */
export function ProjectionRuleRow({
  rule,
  errors,
  readOnly,
  ledgerOptions,
  ruleOptions,
  debtOptions,
  update,
  setRuleType,
  setMethod,
  setSourceType,
  toggle,
  remove,
}: ProjectionRuleRowProps) {
  const idFor = (field: string) => fieldId(rule.id, field);
  const showSource = hasSource(rule.method);
  const showBaseline = needsBaselinePolicy(rule.method, rule.sourceType);
  const isDebt = rule.method === 'debtAmortization';

  const methodOptions: SelectFieldOption[] = ALLOWED_METHODS_BY_RULE_TYPE[rule.ruleType].map(
    (method) => ({ value: method, label: RULE_METHOD_LABELS[method] }),
  );

  const sourceOptions =
    rule.sourceType === 'rule'
      ? ruleOptions
      : rule.sourceType === 'debtAccount'
        ? debtOptions
        : ledgerOptions;

  return (
    <li data-testid="rule-row" className="grid gap-3 border-b border-border pb-4">
      <div className="flex items-end gap-2">
        <div className="grid flex-1 gap-2">
          <Label htmlFor={idFor('name')}>{RULE_LABELS.NAME}</Label>
          <TextInput
            id={idFor('name')}
            value={rule.name}
            onChange={(name) => update({ name })}
            readOnly={readOnly}
            error={!!errorFor(errors, 'name')}
            aria-invalid={!!errorFor(errors, 'name')}
          />
          {errorFor(errors, 'name') && (
            <p className="text-destructive text-sm font-medium">{errorFor(errors, 'name')}</p>
          )}
        </div>

        <label
          htmlFor={idFor('enabled')}
          className="flex h-[34px] items-center gap-2 text-sm text-muted-foreground"
        >
          <Switch
            id={idFor('enabled')}
            checked={rule.enabled}
            onCheckedChange={toggle}
            disabled={readOnly}
          />
          {rule.enabled ? RULE_LABELS.ENABLED : RULE_LABELS.DISABLED}
        </label>

        {!readOnly && (
          <Button variant="text" size="sm" onClick={remove}>
            {RULE_LABELS.DELETE}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={idFor('ruleType')}>{RULE_LABELS.RULE_TYPE}</Label>
          <SelectField
            id={idFor('ruleType')}
            value={rule.ruleType}
            onChange={(value) => setRuleType(value as RuleType)}
            options={TYPE_OPTIONS}
            disabled={readOnly}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor={idFor('method')}>{RULE_LABELS.METHOD}</Label>
          <SelectField
            id={idFor('method')}
            value={rule.method}
            onChange={(value) => setMethod(value as RuleMethod)}
            options={methodOptions}
            disabled={readOnly}
          />
          {errorFor(errors, 'method') && (
            <p className="text-destructive text-sm font-medium">{errorFor(errors, 'method')}</p>
          )}
        </div>

        {rule.method === 'growthRate' && (
          <div className="grid gap-2">
            <Label htmlFor={idFor('parameter')}>{RULE_LABELS.PARAMETER_RATE}</Label>
            <NumberInput
              id={idFor('parameter')}
              value={rule.rateText}
              onChange={(rateText) => update({ rateText })}
              readOnly={readOnly}
              error={!!errorFor(errors, 'parameter')}
            />
            {errorFor(errors, 'parameter') && (
              <p className="text-destructive text-sm font-medium">
                {errorFor(errors, 'parameter')}
              </p>
            )}
          </div>
        )}

        {rule.method === 'percentage' && (
          <div className="grid gap-2">
            <Label htmlFor={idFor('parameter')}>{RULE_LABELS.PARAMETER_RATIO}</Label>
            <NumberInput
              id={idFor('parameter')}
              value={rule.ratioText}
              onChange={(ratioText) => update({ ratioText })}
              readOnly={readOnly}
              error={!!errorFor(errors, 'parameter')}
            />
            {errorFor(errors, 'parameter') && (
              <p className="text-destructive text-sm font-medium">
                {errorFor(errors, 'parameter')}
              </p>
            )}
          </div>
        )}

        {rule.method === 'fixedAmount' && (
          <div className="grid gap-2">
            <Label htmlFor={idFor('parameter')}>{RULE_LABELS.PARAMETER_AMOUNT}</Label>
            <NumberInput
              id={idFor('parameter')}
              value={rule.amountText}
              onChange={(amountText) => update({ amountText })}
              readOnly={readOnly}
              error={!!errorFor(errors, 'parameter')}
            />
            {errorFor(errors, 'parameter') && (
              <p className="text-destructive text-sm font-medium">
                {errorFor(errors, 'parameter')}
              </p>
            )}
          </div>
        )}

        {showSource && (
          <>
            {(rule.method === 'inflation' || rule.method === 'growthRate') && (
              <div className="grid gap-2">
                <Label htmlFor={idFor('sourceType')}>{RULE_LABELS.SOURCE_TYPE}</Label>
                <SelectField
                  id={idFor('sourceType')}
                  value={rule.sourceType}
                  onChange={(value) => setSourceType(value as RuleSourceType)}
                  options={[
                    { value: 'ledgerCode', label: RULE_LABELS.LEDGER_SOURCE },
                    { value: 'rule', label: RULE_LABELS.RULE_SOURCE },
                  ]}
                  disabled={readOnly}
                  error={!!errorFor(errors, 'sourceType')}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor={idFor('sourceId')}>{RULE_LABELS.SOURCE}</Label>
              <SelectField
                id={idFor('sourceId')}
                value={rule.sourceId}
                onChange={(sourceId) => update({ sourceId })}
                options={sourceOptions}
                noneLabel={RULE_LABELS.NO_SOURCE}
                disabled={readOnly}
                error={!!errorFor(errors, 'sourceId')}
              />
              {errorFor(errors, 'sourceId') && (
                <p className="text-destructive text-sm font-medium">
                  {errorFor(errors, 'sourceId')}
                </p>
              )}
            </div>
          </>
        )}

        {!showSource && <p className="text-sm text-muted-foreground">{RULE_LABELS.NO_SOURCE}</p>}

        {showBaseline && (
          <div className="grid gap-2">
            <Label htmlFor={idFor('baselinePolicy')}>{RULE_LABELS.BASELINE_POLICY}</Label>
            <SelectField
              id={idFor('baselinePolicy')}
              value={rule.baselinePolicy}
              onChange={(baselinePolicy) =>
                update({ baselinePolicy: baselinePolicy as RuleDraftVM['baselinePolicy'] })
              }
              options={Object.entries(BASELINE_POLICY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
              noneLabel={RULE_LABELS.CHOOSE_PLACEHOLDER}
              disabled={readOnly}
              error={!!errorFor(errors, 'baselinePolicy')}
            />
            {errorFor(errors, 'baselinePolicy') && (
              <p className="text-destructive text-sm font-medium">
                {errorFor(errors, 'baselinePolicy')}
              </p>
            )}
          </div>
        )}

        {isDebt ? (
          <div className="grid gap-2">
            <span className="text-sm font-medium leading-none">{RULE_LABELS.END_CONDITION}</span>
            <p className="text-sm text-muted-foreground">{RULE_LABELS.DEBT_END}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor={idFor('endCondition')}>{RULE_LABELS.END_CONDITION}</Label>
              <SelectField
                id={idFor('endCondition')}
                value={rule.endConditionType}
                onChange={(value) =>
                  update({ endConditionType: value as RuleDraftVM['endConditionType'] })
                }
                options={Object.entries(END_CONDITION_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                disabled={readOnly}
                error={!!errorFor(errors, 'endCondition')}
              />
              {errorFor(errors, 'endCondition') && (
                <p className="text-destructive text-sm font-medium">
                  {errorFor(errors, 'endCondition')}
                </p>
              )}
            </div>

            {rule.endConditionType === 'specificAge' && (
              <div className="grid gap-2">
                <Label htmlFor={idFor('endAge')}>{RULE_LABELS.END_AGE}</Label>
                <NumberInput
                  id={idFor('endAge')}
                  value={rule.endAge}
                  onChange={(endAge) => update({ endAge })}
                  readOnly={readOnly}
                  error={!!errorFor(errors, 'endAge')}
                />
                {errorFor(errors, 'endAge') && (
                  <p className="text-destructive text-sm font-medium">
                    {errorFor(errors, 'endAge')}
                  </p>
                )}
              </div>
            )}

            {rule.endConditionType === 'specificYear' && (
              <div className="grid gap-2">
                <Label htmlFor={idFor('endYear')}>{RULE_LABELS.END_YEAR}</Label>
                <NumberInput
                  id={idFor('endYear')}
                  value={rule.endYear}
                  onChange={(endYear) => update({ endYear })}
                  readOnly={readOnly}
                  error={!!errorFor(errors, 'endYear')}
                />
                {errorFor(errors, 'endYear') && (
                  <p className="text-destructive text-sm font-medium">
                    {errorFor(errors, 'endYear')}
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </li>
  );
}
