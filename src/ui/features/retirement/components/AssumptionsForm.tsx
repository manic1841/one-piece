import { ListSectionHeader } from '@/ui/components/ListSectionHeader';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { eyebrowClass } from '@/ui/components/eyebrow';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { RetirementAssumptionsLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { type RetirementAssumptionsDisplayVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import { type RetirementPlanCreate } from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementAssumptionsForm } from '../hooks/useRetirementAssumptionsForm';

interface AssumptionsFormProps {
  assumptions: RetirementAssumptionsDisplayVM;
  onSave: (updates: Partial<RetirementPlanCreate>) => void;
}

const L = RetirementAssumptionsLabels;

/**
 * Scenario Assumptions: a five-metric read-only summary (目前年齡 / 退休年齡 /
 * 預期壽命 / 通膨率 / 投資報酬率) that expands in place into a two-group editor.
 * Derived years are parentheticals on the age cells, never their own cells.
 */
export default function AssumptionsForm({ assumptions, onSave }: AssumptionsFormProps) {
  const { editing, startEdit, cancel, form, submit } = useRetirementAssumptionsForm({
    assumptions,
    onSave,
  });

  if (!editing) {
    return (
      <div className="space-y-4">
        <ListSectionHeader
          title={L.viewTitle}
          actions={
            <Button variant="outline" size="sm" onClick={startEdit}>
              {L.editAction}
            </Button>
          }
        />
        <MetricGroup columns={5}>
          <Metric
            testId="assumption-current-age"
            label={L.currentAge}
            value={L.ageWithYear(assumptions.currentAge, assumptions.currentYear)}
          />
          <Metric
            testId="assumption-retirement-age"
            label={L.retirementAge}
            value={L.ageWithYear(assumptions.retirementAge, assumptions.retirementYear)}
          />
          <Metric
            testId="assumption-life-expectancy"
            label={L.lifeExpectancy}
            value={L.ageWithYear(assumptions.lifeExpectancy, assumptions.lifeExpectancyYear)}
          />
          <Metric
            testId="assumption-inflation-rate"
            label={L.inflationRate}
            value={L.ratePercent(assumptions.inflationRate)}
          />
          <Metric
            testId="assumption-investment-return"
            label={L.investmentReturn}
            value={L.ratePercent(assumptions.investmentReturnRate)}
          />
        </MetricGroup>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ListSectionHeader title={L.editTitle} />
      <Form {...form}>
        <form onSubmit={submit} className="space-y-6" noValidate>
          <fieldset className="space-y-3">
            <legend className={eyebrowClass}>{L.timelineGroup}</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField name="currentAge">
                <FormItem>
                  <FormLabel required>{L.currentAge}</FormLabel>
                  <FormControl>
                    <NumberInput />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField name="retirementAge">
                <FormItem>
                  <FormLabel required>{L.retirementAge}</FormLabel>
                  <FormControl>
                    <NumberInput />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField name="lifeExpectancy">
                <FormItem>
                  <FormLabel required>{L.lifeExpectancy}</FormLabel>
                  <FormControl>
                    <NumberInput />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className={eyebrowClass}>{L.financialGroup}</legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField name="inflationRate">
                <FormItem>
                  <FormLabel required>{L.inflationRateInput}</FormLabel>
                  <FormControl>
                    <NumberInput step="0.1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <FormField name="investmentReturnRate">
                <FormItem>
                  <FormLabel required>{L.investmentReturnInput}</FormLabel>
                  <FormControl>
                    <NumberInput step="0.1" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>
          </fieldset>

          <div className="flex gap-2">
            <Button type="submit">{L.saveAction}</Button>
            <Button type="button" variant="outline" onClick={cancel}>
              {L.cancelAction}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
