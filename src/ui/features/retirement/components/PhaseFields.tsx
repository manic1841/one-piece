import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  TextInput,
} from '@/ui/components/form';
import { RetirementEventsLabels as L } from '@/ui/constants/retirement/retirementWorkspaceLabels';

interface PhaseFieldsProps {
  /**
   * RHF field path prefix: `phases.<i>.` inside the event repeater, empty for the
   * single-phase editor. Both editors bind the same `RetirementPhaseFormVMSchema`
   * fields (spec #301 §5.2) — this is the "phase 欄位分支".
   */
  namePrefix?: string;
}

/**
 * A phase's five fields (spec #301 §5.2): optional `name` (blank hides the subtitle,
 * no fallback), required `startYear` / `endYear` / `amount`, and optional `growthRate`
 * (blank follows plan inflation). Shared by the event repeater and the phase editor.
 */
export function PhaseFields({ namePrefix = '' }: PhaseFieldsProps) {
  const path = (field: string) => `${namePrefix}${field}`;

  return (
    <div className="grid gap-4">
      <FormField name={path('name')}>
        <FormItem>
          <FormLabel>{L.phaseNameLabel}</FormLabel>
          <FormControl>
            <TextInput placeholder={L.phaseNamePlaceholder} />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField name={path('startYear')}>
        <FormItem>
          <FormLabel required>{L.startYear}</FormLabel>
          <FormControl>
            <NumberInput />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField name={path('endYear')}>
        <FormItem>
          <FormLabel required>{L.endYear}</FormLabel>
          <FormControl>
            <NumberInput />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField name={path('amount')}>
        <FormItem>
          <FormLabel required>{L.amount}</FormLabel>
          <FormControl>
            <NumberInput min="0" step="0.01" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <FormField name={path('growthRate')}>
        <FormItem>
          <FormLabel>{L.growthRate}</FormLabel>
          <FormControl>
            <NumberInput step="0.1" placeholder={L.growthPlaceholder} />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  );
}
