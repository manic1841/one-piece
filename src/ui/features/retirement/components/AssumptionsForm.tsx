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
      <div className="rounded-lg border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Basic Assumptions</h3>
          <Button onClick={startEdit}>Edit</Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Current Year</div>
            <div className="text-lg font-medium">{assumptions.currentYear}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Birth Year</div>
            <div className="text-lg font-medium">{assumptions.birthYear}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Retirement Age</div>
            <div className="text-lg font-medium">{assumptions.retirementAge}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Life Expectancy</div>
            <div className="text-lg font-medium">{assumptions.lifeExpectancy}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Inflation Rate</div>
            <div className="text-lg font-medium">{assumptions.inflationRate}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Investment Return</div>
            <div className="text-lg font-medium">{assumptions.investmentReturnRate}%</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Edit Assumptions</h3>
      <Form {...form}>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4" noValidate>
          <FormField name="currentYear">
            <FormItem>
              <FormLabel required>Current Year</FormLabel>
              <FormControl>
                <NumberInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="birthYear">
            <FormItem>
              <FormLabel required>Birth Year</FormLabel>
              <FormControl>
                <NumberInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="retirementAge">
            <FormItem>
              <FormLabel required>Retirement Age</FormLabel>
              <FormControl>
                <NumberInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="lifeExpectancy">
            <FormItem>
              <FormLabel required>Life Expectancy</FormLabel>
              <FormControl>
                <NumberInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="inflationRate">
            <FormItem>
              <FormLabel required>Inflation Rate (%)</FormLabel>
              <FormControl>
                <NumberInput step="0.1" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="investmentReturnRate">
            <FormItem>
              <FormLabel required>Investment Return Rate (%)</FormLabel>
              <FormControl>
                <NumberInput step="0.1" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </form>
      </Form>

      <div className="flex gap-2 mt-6">
        <Button onClick={() => submit()}>Save</Button>
        <Button variant="outline" onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
