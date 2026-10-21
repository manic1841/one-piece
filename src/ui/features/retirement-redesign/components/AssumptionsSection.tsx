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
import { ASSUMPTION_LABELS as LABELS } from '@/ui/constants/retirement-redesign/setupLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import {
  type AssumptionField,
  type AssumptionsVM,
} from '@/ui/features/retirement-redesign/hooks/useAssumptionDraft';

interface AssumptionsSectionProps {
  form: UseFormReturn<AssumptionsVM>;
  errors: Partial<Record<AssumptionField, string>>;
  birthYearLocked: boolean;
  readOnly: boolean;
}

interface FieldConfig {
  field: keyof AssumptionsVM;
  label: string;
  integer: boolean;
}

const FIELDS: FieldConfig[] = [
  { field: 'birthYear', label: LABELS.BIRTH_YEAR, integer: true },
  { field: 'retirementAge', label: LABELS.RETIREMENT_AGE, integer: true },
  { field: 'lifeExpectancy', label: LABELS.LIFE_EXPECTANCY, integer: true },
  { field: 'inflationRate', label: LABELS.INFLATION_RATE, integer: false },
  { field: 'annualReturnRate', label: LABELS.ANNUAL_RETURN_RATE, integer: false },
];

/**
 * All five assumptions stay visible in one fixed order. Rates cross the field
 * boundary as percentages; the domain schema only ever sees decimals.
 */
export function AssumptionsSection({
  form,
  errors,
  birthYearLocked,
  readOnly,
}: AssumptionsSectionProps) {
  return (
    <Form {...form}>
      <PageSection
        number="01"
        title={PROJECTION_WORKSPACE_LABELS.ASSUMPTIONS_SECTION}
        spacing="compact"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(({ field, label, integer }) => {
            const locked = field === 'birthYear' && birthYearLocked;

            return (
              <FormField key={field} name={field}>
                <FormItem>
                  <FormLabel>{label}</FormLabel>
                  <FormControl>
                    <NumberInput readOnly={readOnly || locked} step={integer ? 1 : 'any'} />
                  </FormControl>
                  <FormMessage>{errors[field]}</FormMessage>
                </FormItem>
              </FormField>
            );
          })}
        </div>
      </PageSection>
    </Form>
  );
}
