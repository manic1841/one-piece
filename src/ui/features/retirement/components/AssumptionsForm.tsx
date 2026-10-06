import { ListSectionHeader } from '@/ui/components/ListSectionHeader';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
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

export default function AssumptionsForm({ assumptions, onSave }: AssumptionsFormProps) {
  const { editing, startEdit, cancel, form, submit } = useRetirementAssumptionsForm({
    assumptions,
    onSave,
  });

  if (!editing) {
    return (
      <div className="space-y-4">
        <ListSectionHeader
          title={RetirementAssumptionsLabels.viewTitle}
          actions={
            <Button variant="outline" size="sm" onClick={startEdit}>
              {RetirementAssumptionsLabels.editAction}
            </Button>
          }
        />
        <MetricGroup columns={3}>
          <Metric
            label={RetirementAssumptionsLabels.currentYear}
            value={String(assumptions.currentYear)}
          />
          <Metric
            label={RetirementAssumptionsLabels.birthYear}
            value={String(assumptions.birthYear)}
          />
          <Metric
            label={RetirementAssumptionsLabels.retirementAge}
            value={String(assumptions.retirementAge)}
          />
          <Metric
            label={RetirementAssumptionsLabels.lifeExpectancy}
            value={String(assumptions.lifeExpectancy)}
          />
          <Metric
            label={RetirementAssumptionsLabels.inflationRate}
            value={`${assumptions.inflationRate}%`}
          />
          <Metric
            label={RetirementAssumptionsLabels.investmentReturn}
            value={`${assumptions.investmentReturnRate}%`}
          />
        </MetricGroup>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ListSectionHeader title={RetirementAssumptionsLabels.editTitle} />
      <Form {...form}>
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2" noValidate>
          <FormField name="currentYear">
            <FormItem>
              <FormLabel required>{RetirementAssumptionsLabels.currentYear}</FormLabel>
              <FormControl>
                <NumberInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="birthYear">
            <FormItem>
              <FormLabel required>{RetirementAssumptionsLabels.birthYear}</FormLabel>
              <FormControl>
                <NumberInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="retirementAge">
            <FormItem>
              <FormLabel required>{RetirementAssumptionsLabels.retirementAge}</FormLabel>
              <FormControl>
                <NumberInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="lifeExpectancy">
            <FormItem>
              <FormLabel required>{RetirementAssumptionsLabels.lifeExpectancy}</FormLabel>
              <FormControl>
                <NumberInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="inflationRate">
            <FormItem>
              <FormLabel required>{RetirementAssumptionsLabels.inflationRateInput}</FormLabel>
              <FormControl>
                <NumberInput step="0.1" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="investmentReturnRate">
            <FormItem>
              <FormLabel required>{RetirementAssumptionsLabels.investmentReturnInput}</FormLabel>
              <FormControl>
                <NumberInput step="0.1" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </form>
      </Form>

      <div className="flex gap-2">
        <Button onClick={() => submit()}>{RetirementAssumptionsLabels.saveAction}</Button>
        <Button variant="outline" onClick={cancel}>
          {RetirementAssumptionsLabels.cancelAction}
        </Button>
      </div>
    </div>
  );
}
