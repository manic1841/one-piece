import { NumberInput } from '@/ui/components/NumberInput';
import { PageSection } from '@/ui/components/PageSection';
import { Label } from '@/ui/components/ui/label';
import { ASSUMPTION_LABELS as LABELS } from '@/ui/constants/retirement-redesign/setupLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import {
  type AssumptionField,
  type AssumptionsVM,
} from '@/ui/features/retirement-redesign/hooks/useAssumptionDraft';

interface AssumptionsSectionProps {
  values: AssumptionsVM;
  errors: Partial<Record<AssumptionField, string>>;
  birthYearLocked: boolean;
  readOnly: boolean;
  setField: (field: AssumptionField, value: string) => void;
}

interface FieldConfig {
  field: AssumptionField;
  label: string;
  integer: boolean;
  suffix?: string;
}

const FIELDS: FieldConfig[] = [
  { field: 'birthYear', label: LABELS.BIRTH_YEAR, integer: true },
  { field: 'retirementAge', label: LABELS.RETIREMENT_AGE, integer: true },
  { field: 'lifeExpectancy', label: LABELS.LIFE_EXPECTANCY, integer: true },
  { field: 'inflationRate', label: LABELS.INFLATION_RATE, integer: false },
  { field: 'annualReturnRate', label: LABELS.ANNUAL_RETURN_RATE, integer: false },
];

const FIELD_ID_PREFIX = 'projection-assumption';

/**
 * All five assumptions stay visible in one fixed order. Rates cross the field
 * boundary as percentages; the domain schema only ever sees decimals.
 */
export function AssumptionsSection({
  values,
  errors,
  birthYearLocked,
  readOnly,
  setField,
}: AssumptionsSectionProps) {
  return (
    <PageSection
      number="01"
      title={PROJECTION_WORKSPACE_LABELS.ASSUMPTIONS_SECTION}
      spacing="compact"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map(({ field, label, integer }) => {
          const id = `${FIELD_ID_PREFIX}-${field}`;
          const error = errors[field];
          const locked = field === 'birthYear' && birthYearLocked;

          return (
            <div key={field} className="grid gap-2">
              <Label htmlFor={id}>{label}</Label>
              <NumberInput
                id={id}
                value={values[field]}
                onChange={(next) => setField(field, next)}
                readOnly={readOnly || locked}
                error={!!error}
                aria-invalid={!!error}
                aria-describedby={error ? `${id}-error` : undefined}
                step={integer ? 1 : 'any'}
              />
              {error && (
                <p id={`${id}-error`} className="text-destructive text-sm font-medium">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </PageSection>
  );
}
