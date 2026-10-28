import { type UseFormReturn } from 'react-hook-form';

import { PageSection } from '@/ui/components/PageSection';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SelectField,
} from '@/ui/components/form';
import { RETIREMENT_AGE_LIST_MAX } from '@/ui/constants/retirement/bounds';
import { type RetirementAssumptionBounds } from '@/ui/constants/retirement/bounds';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { ASSUMPTION_LABELS as LABELS } from '@/ui/constants/retirement/setupLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import {
  WORKSPACE_RAIL_LABELS,
  WORKSPACE_SECTION_LABELS,
} from '@/ui/constants/retirement/workspaceRailLabels';
import { PercentSlider } from '@/ui/features/retirement/components/PercentSlider';
import {
  type AssumptionField,
  type AssumptionsVM,
} from '@/ui/features/retirement/viewmodels/assumptionForm.vm';
import { numberOptions } from '@/ui/features/retirement/viewmodels/numberOptions.vm';

interface AssumptionsSectionProps {
  form: UseFormReturn<AssumptionsVM>;
  errors: Partial<Record<AssumptionField, string>>;
  bounds: RetirementAssumptionBounds;
  birthYearLocked: boolean;
  readOnly: boolean;
  ageRange: { min: number; max: number };
  retirementYear: number | null;
  onRetirementAgeChange: (value: string) => void;
  onFieldChange: (field: AssumptionField, value: string) => void;
  /** Band state and reason; only reported when a field is invalid. */
  status?: 'error';
  hint?: string;
}

type RateField = 'inflationRate' | 'annualReturnRate';

const percent = (ratio: number) => Math.round(ratio * 100);

/**
 * Two groups with one control type each. Ages are selects: the values are
 * whole years from a known range and nothing recalculates until CALCULATE, so a
 * slider's live scrubbing buys nothing. Rates are sliders whose value sits on
 * the label row, so each number reads as part of its own field rather than as
 * the start of the neighbouring one. Every field still ends at the schema; rates
 * cross the field boundary as percentages and the schema only sees decimals.
 */
export function AssumptionsSection({
  form,
  errors,
  bounds,
  birthYearLocked,
  readOnly,
  ageRange,
  retirementYear,
  onRetirementAgeChange,
  onFieldChange,
  status,
  hint,
}: AssumptionsSectionProps) {
  const groupLabelClass = 'text-xs font-medium tracking-wide text-muted-foreground uppercase';
  const hintClass = 'text-xs text-muted-foreground';

  const rates: { field: RateField; label: string; min: number; max: number }[] = [
    {
      field: 'inflationRate',
      label: LABELS.INFLATION_RATE,
      min: percent(bounds.inflationRate.min),
      max: percent(bounds.inflationRate.max),
    },
    {
      field: 'annualReturnRate',
      label: LABELS.ANNUAL_RETURN_RATE,
      min: percent(bounds.annualReturnRate.min),
      max: percent(bounds.annualReturnRate.max),
    },
  ];

  return (
    <Form {...form}>
      <PageSection
        number={WORKSPACE_SECTION_LABELS.NUMBER_ASSUMPTIONS}
        title={PROJECTION_WORKSPACE_LABELS.ASSUMPTIONS_SECTION}
        status={status}
        hint={hint}
        testId="section-assumptions"
        spacing="compact"
      >
        <div className="grid gap-4">
          <section className="grid gap-3" aria-label={LABELS.AGE_GROUP}>
            <p className={groupLabelClass}>{LABELS.AGE_GROUP}</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField name="birthYear">
                <FormItem>
                  <FormLabel>{LABELS.BIRTH_YEAR}</FormLabel>
                  <FormControl>
                    <SelectField
                      value={form.watch('birthYear')}
                      onChange={(value) => onFieldChange('birthYear', value)}
                      options={numberOptions(bounds.birthYear.min, bounds.birthYear.max)}
                      disabled={readOnly || birthYearLocked}
                    />
                  </FormControl>
                  {birthYearLocked && <p className={hintClass}>{LABELS.BIRTH_YEAR_LOCKED}</p>}
                  <FormMessage>{errors.birthYear}</FormMessage>
                </FormItem>
              </FormField>

              <FormField name="retirementAge">
                <FormItem>
                  <FormLabel>{LABELS.RETIREMENT_AGE}</FormLabel>
                  <FormControl>
                    <SelectField
                      value={form.watch('retirementAge')}
                      onChange={onRetirementAgeChange}
                      options={numberOptions(ageRange.min, ageRange.max)}
                      placeholder={PROJECTION_COMMON_LABELS.DASH}
                      disabled={readOnly}
                    />
                  </FormControl>
                  <p className={hintClass} data-testid="retirement-year">
                    {WORKSPACE_RAIL_LABELS.RETIREMENT_YEAR}{' '}
                    {retirementYear ?? PROJECTION_COMMON_LABELS.DASH}
                  </p>
                  <FormMessage>{errors.retirementAge}</FormMessage>
                </FormItem>
              </FormField>

              <FormField name="lifeExpectancy">
                <FormItem>
                  <FormLabel>{LABELS.LIFE_EXPECTANCY}</FormLabel>
                  <FormControl>
                    <SelectField
                      value={form.watch('lifeExpectancy')}
                      onChange={(value) => onFieldChange('lifeExpectancy', value)}
                      options={numberOptions(1, RETIREMENT_AGE_LIST_MAX)}
                      disabled={readOnly}
                    />
                  </FormControl>
                  <FormMessage>{errors.lifeExpectancy}</FormMessage>
                </FormItem>
              </FormField>
            </div>
          </section>

          <section
            className="grid gap-3 border-t border-border pt-4"
            aria-label={LABELS.RATE_GROUP}
          >
            <p className={groupLabelClass}>{LABELS.RATE_GROUP}</p>
            <div className="grid gap-x-12 gap-y-4 sm:grid-cols-2">
              {rates.map(({ field, label, min, max }) => {
                const value = form.watch(field);
                return (
                  <FormField key={field} name={field}>
                    <FormItem>
                      <div className="flex items-baseline justify-between gap-3">
                        <FormLabel>{label}</FormLabel>
                        <span className="font-mono text-sm font-semibold tabular-nums">
                          {value === '' ? PROJECTION_COMMON_LABELS.DASH : `${value}%`}
                        </span>
                      </div>
                      <FormControl>
                        <PercentSlider
                          min={min}
                          max={max}
                          disabled={readOnly}
                          showReadout={false}
                          onChange={(next) => onFieldChange(field, next)}
                        />
                      </FormControl>
                      <FormMessage>{errors[field]}</FormMessage>
                    </FormItem>
                  </FormField>
                );
              })}
            </div>
          </section>
        </div>
      </PageSection>
    </Form>
  );
}
