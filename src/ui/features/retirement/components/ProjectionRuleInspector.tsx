import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/ui/components/form';
import {
  ComboboxField,
  type ComboboxOption,
  NumberInput,
  SelectField,
  type SelectFieldOption,
  TextInput,
} from '@/ui/components/form';
import { Switch } from '@/ui/components/ui/switch';
import { RETIREMENT_GROWTH_RATE_BOUNDS } from '@/ui/constants/retirement/bounds';
import {
  BASELINE_POLICY_LABELS,
  END_CONDITION_LABELS,
  RULE_LABELS,
  RULE_METHOD_LABELS,
  RULE_TYPE_LABELS,
} from '@/ui/constants/retirement/setupLabels';
import { PercentSlider } from '@/ui/features/retirement/components/PercentSlider';
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
  showsKeepsPace,
} from '@/ui/features/retirement/viewmodels/ruleForm.vm';

interface ProjectionRuleInspectorProps {
  rule: RuleDraftVM;
  index: number;
  readOnly: boolean;
  ledgerOptions: ComboboxOption[];
  ruleOptions: ComboboxOption[];
  debtOptions: ComboboxOption[];
  /** Ledger codes still unassigned, printed under the picker while editing a ledger source. */
  unassignedCount: number;
  errors: RuleErrors;
  update: (patch: Partial<RuleDraftVM>) => void;
  setRuleType: (ruleType: RuleType) => void;
  setMethod: (method: RuleMethod) => void;
  setSourceType: (sourceType: RuleSourceType) => void;
  toggle: () => void;
}

const TYPE_OPTIONS: SelectFieldOption[] = Object.entries(RULE_TYPE_LABELS).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

/** Domain ratio -> the percentage the slider and its readout speak. */
const percent = (ratio: number) => Math.round(ratio * 100);

/**
 * Every editable field of one rule, hosted by `ProjectionRuleDialog`. The list row
 * only summarises, so this panel can print the whole method union — source,
 * baseline policy and end condition stay mounted for the method that has them,
 * never behind a second disclosure.
 */
export function ProjectionRuleInspector({
  rule,
  index,
  readOnly,
  ledgerOptions,
  ruleOptions,
  debtOptions,
  unassignedCount,
  errors,
  update,
  setRuleType,
  setMethod,
  setSourceType,
  toggle,
}: ProjectionRuleInspectorProps) {
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
    <div className="grid gap-4" data-testid="rule-inspector">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField name={`${prefix}.name`}>
          <FormItem className="sm:col-span-2">
            <FormLabel required>{RULE_LABELS.NAME}</FormLabel>
            <FormControl>
              {/* eslint-disable-next-line jsx-a11y/no-autofocus -- the dialog's whole job is this one field */}
              <TextInput readOnly={readOnly} autoFocus onChange={(name) => update({ name })} />
            </FormControl>
            <FormMessage>{errors.name}</FormMessage>
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
                <PercentSlider
                  min={percent(RETIREMENT_GROWTH_RATE_BOUNDS.min)}
                  max={percent(RETIREMENT_GROWTH_RATE_BOUNDS.max)}
                  disabled={readOnly}
                  onChange={(rateText) => update({ rateText })}
                />
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

        {!readOnly && (
          <FormField name={`${prefix}.ruleType`}>
            <FormItem>
              <FormLabel>{RULE_LABELS.RULE_TYPE}</FormLabel>
              <FormControl>
                <SelectField
                  value={rule.ruleType}
                  onChange={(value) => setRuleType(value as RuleType)}
                  options={TYPE_OPTIONS}
                />
              </FormControl>
              {hiddenMessage('ruleType')}
            </FormItem>
          </FormField>
        )}

        {showsKeepsPace(rule.method) && (
          <FormField name={`${prefix}.keepsPace`}>
            <FormItem className="grid gap-2">
              <span className="text-sm leading-none font-medium">{RULE_LABELS.KEEPS_PACE}</span>
              <label className="text-muted-foreground flex items-center gap-2">
                <Switch
                  checked={rule.keepsPace}
                  onCheckedChange={(keepsPace) => update({ keepsPace })}
                  disabled={readOnly}
                  data-testid="rule-keeps-pace"
                />
                {rule.keepsPace ? RULE_LABELS.ENABLED : RULE_LABELS.DISABLED}
              </label>
              {hiddenMessage('keepsPace')}
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
                  <ComboboxField
                    value={rule.sourceId}
                    onChange={(sourceId) => update({ sourceId })}
                    options={sourceOptions}
                    noneLabel={RULE_LABELS.NO_SOURCE}
                    searchPlaceholder={RULE_LABELS.SOURCE_SEARCH}
                    emptyLabel={RULE_LABELS.SOURCE_NO_MATCH}
                    disabled={readOnly}
                  />
                </FormControl>
                {rule.sourceType === 'ledgerCode' && (
                  <p className="text-muted-foreground text-[13px]" data-testid="unassigned-count">
                    {RULE_LABELS.SOURCE_UNASSIGNED.replace('{count}', String(unassignedCount))}
                  </p>
                )}
                {hiddenMessage('sourceId')}
              </FormItem>
            </FormField>
          </>
        )}

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
            <span className="text-sm leading-none font-medium">{RULE_LABELS.END_CONDITION}</span>
            <p className="text-muted-foreground text-[13px]">{RULE_LABELS.DEBT_END}</p>
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

        <FormField name={`${prefix}.enabled`}>
          <FormItem className="grid gap-2">
            <span className="text-sm leading-none font-medium">{RULE_LABELS.STATE}</span>
            <label className="text-muted-foreground flex items-center gap-2">
              <Switch
                checked={rule.enabled}
                onCheckedChange={toggle}
                disabled={readOnly}
                data-testid="rule-enabled"
              />
              {rule.enabled ? RULE_LABELS.ENABLED : RULE_LABELS.DISABLED}
            </label>
          </FormItem>
        </FormField>
      </div>
    </div>
  );
}
