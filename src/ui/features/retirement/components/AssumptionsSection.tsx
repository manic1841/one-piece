import { type ChangeEvent } from 'react';

import { type UseFormReturn } from 'react-hook-form';

import { NumberInput } from '@/ui/components/NumberInput';
import { PageSection } from '@/ui/components/PageSection';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/components/form';
import { ASSUMPTION_LABELS as LABELS } from '@/ui/constants/retirement/setupLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { WORKSPACE_SECTION_LABELS } from '@/ui/constants/retirement/workspaceRailLabels';
import { RetirementAgeSlider } from '@/ui/features/retirement/components/RetirementAgeSlider';
import {
  type AssumptionField,
  type AssumptionsVM,
} from '@/ui/features/retirement/viewmodels/assumptionForm.vm';

interface AssumptionsSectionProps {
  form: UseFormReturn<AssumptionsVM>;
  errors: Partial<Record<AssumptionField, string>>;
  birthYearLocked: boolean;
  readOnly: boolean;
  ageRange: { min: number; max: number };
  retirementYear: number | null;
  onRetirementAgeChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onFieldChange: (field: AssumptionField, value: string) => void;
}

interface FieldConfig {
  field: keyof AssumptionsVM;
  label: string;
  integer: boolean;
}

const FIELDS: FieldConfig[] = [
  { field: 'birthYear', label: LABELS.BIRTH_YEAR, integer: true },
  { field: 'lifeExpectancy', label: LABELS.LIFE_EXPECTANCY, integer: true },
  { field: 'inflationRate', label: LABELS.INFLATION_RATE, integer: false },
  { field: 'annualReturnRate', label: LABELS.ANNUAL_RETURN_RATE, integer: false },
];

/**
 * Four typed fields on a two-column grid, then the retirement-age slider full
 * width last. The slider closes the section because it is the one field with a
 * derived readout (the retirement year) and a range to drag, so it needs the
 * whole width. Rates cross the field boundary as percentages; the domain schema
 * only ever sees decimals.
 */
export function AssumptionsSection({
  form,
  errors,
  birthYearLocked,
  readOnly,
  ageRange,
  retirementYear,
  onRetirementAgeChange,
  onFieldChange,
}: AssumptionsSectionProps) {
  return (
    <Form {...form}>
      <PageSection
        number={WORKSPACE_SECTION_LABELS.NUMBER_ASSUMPTIONS}
        title={PROJECTION_WORKSPACE_LABELS.ASSUMPTIONS_SECTION}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {FIELDS.map(({ field, label, integer }) => (
            <FormField key={field} name={field}>
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <NumberInput
                    readOnly={readOnly || (field === 'birthYear' && birthYearLocked)}
                    step={integer ? 1 : 'any'}
                    onChange={(value) => onFieldChange(field, value)}
                  />
                </FormControl>
                <FormMessage>{errors[field]}</FormMessage>
              </FormItem>
            </FormField>
          ))}
          <FormField name="retirementAge">
            <FormItem className="sm:col-span-2">
              <FormControl>
                <RetirementAgeSlider
                  value={form.watch('retirementAge')}
                  min={ageRange.min}
                  max={ageRange.max}
                  retirementYear={retirementYear}
                  error={errors.retirementAge}
                  readOnly={readOnly}
                  onChange={onRetirementAgeChange}
                />
              </FormControl>
              <FormMessage className="sr-only">{errors.retirementAge}</FormMessage>
            </FormItem>
          </FormField>
        </div>
      </PageSection>
    </Form>
  );
}
