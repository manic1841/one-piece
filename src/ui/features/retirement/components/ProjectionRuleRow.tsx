import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/components/form';
import { NumberInput } from '@/ui/components/form';
import { SelectField, type SelectFieldOption, TextInput } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Switch } from '@/ui/components/ui/switch';
import {
  BASELINE_POLICY_LABELS,
  END_CONDITION_LABELS,
  RULE_LABELS,
  RULE_METHOD_LABELS,
  RULE_TYPE_LABELS,
} from '@/ui/constants/retirement/setupLabels';
import {
  ALLOWED_METHODS_BY_RULE_TYPE,
  type RuleDraftVM,
  type RuleErrors,
  type RuleMethod,
  type RuleSourceType,
  type RuleType,
  hasSource,
  needsBaselinePolicy,
  needsBaselineYear,
} from '@/ui/features/retirement/viewmodels/ruleForm.vm';

interface ProjectionRuleRowProps {
  index: number;
  rule: RuleDraftVM;
  readOnly: boolean;
  ledgerOptions: SelectFieldOption[];
  ruleOptions: SelectFieldOption[];
  debtOptions: SelectFieldOption[];
  errors: RuleErrors;
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

/**
 * One rule editor. Method drives the parameter, end-condition and source
 * branches, so only the fields that belong to the current union are mounted.
 * Row errors are summarised by the section; the hidden FormMessage keeps each
 * control's `aria-describedby` target alive.
 */
export function ProjectionRuleRow({
  index,
  rule,
  readOnly,
  ledgerOptions,
  ruleOptions,
  debtOptions,
  errors,
  update,
  setRuleType,
  setMethod,
  setSourceType,
  toggle,
  remove,
}: ProjectionRuleRowProps) {
  const prefix = `rules.${index}`;
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

  const hiddenMessage = (field: keyof RuleErrors) => (
    <FormMessage className="sr-only">{errors[field]}</FormMessage>
  );

  return (
    <li data-testid="rule-row" className="grid gap-3 border-b border-border pb-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormField name={`${prefix}.name`}>
            <FormItem>
              <FormLabel>{RULE_LABELS.NAME}</FormLabel>
              <FormControl>
                <TextInput readOnly={readOnly} onChange={(name) => update({ name })} />
              </FormControl>
              {hiddenMessage('name')}
            </FormItem>
          </FormField>
        </div>

        <label className="flex h-[34px] items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={rule.enabled} onCheckedChange={toggle} disabled={readOnly} />
          {rule.enabled ? RULE_LABELS.ENABLED : RULE_LABELS.DISABLED}
        </label>

        {!readOnly && (
          <Button variant="text" size="sm" onClick={remove}>
            {RULE_LABELS.DELETE}
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name={`${prefix}.ruleType`}>
          <FormItem>
            <FormLabel>{RULE_LABELS.RULE_TYPE}</FormLabel>
            <FormControl>
              <SelectField
                value={rule.ruleType}
                onChange={(value) => setRuleType(value as RuleType)}
                options={TYPE_OPTIONS}
                disabled={readOnly}
              />
            </FormControl>
            {hiddenMessage('ruleType')}
          </FormItem>
        </FormField>

        <FormField name={`${prefix}.method`}>
          <FormItem>
            <FormLabel>{RULE_LABELS.METHOD}</FormLabel>
            <FormControl>
              <SelectField
                value={rule.method}
                onChange={(value) => setMethod(value as RuleMethod)}
                options={methodOptions}
                disabled={readOnly}
              />
            </FormControl>
            {hiddenMessage('method')}
          </FormItem>
        </FormField>

        {rule.method === 'growthRate' && (
          <FormField name={`${prefix}.rateText`}>
            <FormItem>
              <FormLabel>{RULE_LABELS.PARAMETER_RATE}</FormLabel>
              <FormControl>
                <NumberInput readOnly={readOnly} onChange={(rateText) => update({ rateText })} />
              </FormControl>
              {hiddenMessage('parameter')}
            </FormItem>
          </FormField>
        )}

        {rule.method === 'percentage' && (
          <FormField name={`${prefix}.ratioText`}>
            <FormItem>
              <FormLabel>{RULE_LABELS.PARAMETER_RATIO}</FormLabel>
              <FormControl>
                <NumberInput readOnly={readOnly} onChange={(ratioText) => update({ ratioText })} />
              </FormControl>
              {hiddenMessage('parameter')}
            </FormItem>
          </FormField>
        )}

        {rule.method === 'fixedAmount' && (
          <FormField name={`${prefix}.amountText`}>
            <FormItem>
              <FormLabel>{RULE_LABELS.PARAMETER_AMOUNT}</FormLabel>
              <FormControl>
                <NumberInput
                  readOnly={readOnly}
                  onChange={(amountText) => update({ amountText })}
                />
              </FormControl>
              {hiddenMessage('parameter')}
            </FormItem>
          </FormField>
        )}

        {showSource && (
          <>
            {(rule.method === 'inflation' || rule.method === 'growthRate') && (
              <FormField name={`${prefix}.sourceType`}>
                <FormItem>
                  <FormLabel>{RULE_LABELS.SOURCE_TYPE}</FormLabel>
                  <FormControl>
                    <SelectField
                      value={rule.sourceType}
                      onChange={(value) => setSourceType(value as RuleSourceType)}
                      options={[
                        { value: 'ledgerCode', label: RULE_LABELS.LEDGER_SOURCE },
                        { value: 'rule', label: RULE_LABELS.RULE_SOURCE },
                      ]}
                      disabled={readOnly}
                    />
                  </FormControl>
                  {hiddenMessage('sourceType')}
                </FormItem>
              </FormField>
            )}

            <FormField name={`${prefix}.sourceId`}>
              <FormItem>
                <FormLabel>{RULE_LABELS.SOURCE}</FormLabel>
                <FormControl>
                  <SelectField
                    value={rule.sourceId}
                    onChange={(sourceId) => update({ sourceId })}
                    options={sourceOptions}
                    noneLabel={RULE_LABELS.NO_SOURCE}
                    disabled={readOnly}
                  />
                </FormControl>
                {hiddenMessage('sourceId')}
              </FormItem>
            </FormField>
          </>
        )}

        {!showSource && <p className="text-sm text-muted-foreground">{RULE_LABELS.NO_SOURCE}</p>}

        {showBaseline && (
          <FormField name={`${prefix}.baselinePolicy`}>
            <FormItem>
              <FormLabel>{RULE_LABELS.BASELINE_POLICY}</FormLabel>
              <FormControl>
                <SelectField
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
                />
              </FormControl>
              {hiddenMessage('baselinePolicy')}
            </FormItem>
          </FormField>
        )}

        {showBaseline && needsBaselineYear(rule.baselinePolicy) && (
          <FormField name={`${prefix}.baselineYearText`}>
            <FormItem>
              <FormLabel required>{RULE_LABELS.BASELINE_YEAR}</FormLabel>
              <FormControl>
                <NumberInput
                  readOnly={readOnly}
                  step={1}
                  onChange={(baselineYearText) => update({ baselineYearText })}
                />
              </FormControl>
              {hiddenMessage('baselineYear')}
            </FormItem>
          </FormField>
        )}

        {isDebt ? (
          <div className="grid gap-2">
            <span className="text-sm font-medium leading-none">{RULE_LABELS.END_CONDITION}</span>
            <p className="text-sm text-muted-foreground">{RULE_LABELS.DEBT_END}</p>
          </div>
        ) : (
          <>
            <FormField name={`${prefix}.endConditionType`}>
              <FormItem>
                <FormLabel>{RULE_LABELS.END_CONDITION}</FormLabel>
                <FormControl>
                  <SelectField
                    value={rule.endConditionType}
                    onChange={(value) =>
                      update({ endConditionType: value as RuleDraftVM['endConditionType'] })
                    }
                    options={Object.entries(END_CONDITION_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                    disabled={readOnly}
                  />
                </FormControl>
                {hiddenMessage('endCondition')}
              </FormItem>
            </FormField>

            {rule.endConditionType === 'specificAge' && (
              <FormField name={`${prefix}.endAge`}>
                <FormItem>
                  <FormLabel>{RULE_LABELS.END_AGE}</FormLabel>
                  <FormControl>
                    <NumberInput readOnly={readOnly} onChange={(endAge) => update({ endAge })} />
                  </FormControl>
                  {hiddenMessage('endAge')}
                </FormItem>
              </FormField>
            )}

            {rule.endConditionType === 'specificYear' && (
              <FormField name={`${prefix}.endYear`}>
                <FormItem>
                  <FormLabel>{RULE_LABELS.END_YEAR}</FormLabel>
                  <FormControl>
                    <NumberInput readOnly={readOnly} onChange={(endYear) => update({ endYear })} />
                  </FormControl>
                  {hiddenMessage('endYear')}
                </FormItem>
              </FormField>
            )}
          </>
        )}
      </div>
    </li>
  );
}
