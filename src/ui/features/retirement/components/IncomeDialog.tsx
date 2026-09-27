import { useState } from 'react';

import { ChevronDown, Plus } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  SelectField,
  TextInput,
  useFormField,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/components/ui/dialog';
import { Label } from '@/ui/components/ui/label';
import { Switch } from '@/ui/components/ui/switch';
import { RetirementIncomeDialogLabels } from '@/ui/constants/retirement/incomeDialogLabels';
import { RetirementIncomeTypeOptions } from '@/ui/constants/retirement/retirementLabel';
import type { RetirementIncomeSource } from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementIncomeDialog } from '../hooks/useRetirementIncomeDialog';

interface IncomeDialogProps {
  onSave: (income: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  currentYear: number;
  planInflationRate: number;
  initialData?: RetirementIncomeSource;
  trigger?: React.ReactNode;
}

/**
 * Lifelong toggle. Radix `Switch` speaks `checked`/`onCheckedChange`, not the
 * suite's `value`/`onChange` contract, so it binds through `useFormField`
 * directly instead of `FormControl`.
 */
const LifelongToggle = () => {
  const { field } = useFormField();
  return <Switch id="lifelong" checked={Boolean(field.value)} onCheckedChange={field.onChange} />;
};

export default function IncomeDialog({
  onSave,
  currentYear,
  planInflationRate,
  initialData,
  trigger,
}: IncomeDialogProps) {
  const {
    open,
    setOpen,
    loading,
    form,
    currentAnnual,
    growthText,
    durationText,
    submitError,
    handleSubmit,
  } = useRetirementIncomeDialog({
    initialData,
    currentYear,
    planInflationRate,
    onSave,
  });

  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleOpenChange = (value: boolean) => {
    if (value) setAdvancedOpen(false);
    setOpen(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Income
          </Button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Income Stream' : 'Add Income Stream'}</DialogTitle>
          <DialogDescription>
            {initialData ? 'Update the details of this income source.' : 'Add a new income source.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4" noValidate>
            {/* Row 1: Name */}
            <FormField name="name">
              <FormItem>
                <FormLabel required>Name</FormLabel>
                <FormControl>
                  <TextInput placeholder="e.g., Salary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            {/* Row 2: Type */}
            <FormField name="type">
              <FormItem>
                <FormLabel required>{RetirementIncomeDialogLabels.type}</FormLabel>
                <FormControl>
                  <SelectField options={RetirementIncomeTypeOptions} placeholder="Select type..." />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            {/* Current Annual: system-derived from the ledger import */}
            <div className="grid gap-2">
              <Label htmlFor="currentAnnual">{RetirementIncomeDialogLabels.currentAnnual}</Label>
              {currentAnnual == null ? (
                <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {RetirementIncomeDialogLabels.noCurrentAnnualMarker}
                </div>
              ) : (
                <NumberInput id="currentAnnual" value={String(currentAnnual)} readOnly />
              )}
            </div>
            {currentAnnual == null && (
              <p className="text-xs text-muted-foreground">
                {RetirementIncomeDialogLabels.importHint}
              </p>
            )}

            {/* Retirement Annual: user assumption */}
            <FormField name="retirementAnnual">
              <FormItem>
                <FormLabel>{RetirementIncomeDialogLabels.retirementAnnual}</FormLabel>
                <FormControl>
                  <NumberInput min="0" step="1" placeholder="0 for no retirement income" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            {/* Growth: plan inflation default, explicit rate in Advanced */}
            <div className="grid gap-2">
              <Label>{RetirementIncomeDialogLabels.growth}</Label>
              <div className="rounded-md border px-3 py-2 text-sm">{growthText}</div>
            </div>

            {/* Duration readout */}
            <div className="grid gap-2">
              <Label>{RetirementIncomeDialogLabels.duration}</Label>
              <div className="rounded-md border px-3 py-2 text-sm">{durationText}</div>
            </div>

            {/* Lifelong toggle */}
            <FormField name="lifelong">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="lifelong">{RetirementIncomeDialogLabels.lifelongLabel}</Label>
                <LifelongToggle />
              </div>
            </FormField>

            {/* Advanced: growth rate + start/end years */}
            <div className="grid gap-2">
              <button
                type="button"
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm font-medium"
                onClick={() => setAdvancedOpen((prev) => !prev)}
                aria-expanded={advancedOpen}
              >
                {RetirementIncomeDialogLabels.advanced}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {advancedOpen && (
                <div className="grid gap-4">
                  <FormField name="growthRate">
                    <FormItem>
                      <FormLabel>Growth Rate (%)</FormLabel>
                      <FormControl>
                        <NumberInput
                          step="0.1"
                          placeholder={
                            planInflationRate != null
                              ? `Plan inflation ${planInflationRate}%`
                              : 'Plan inflation'
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField name="startYear">
                      <FormItem>
                        <FormLabel required>Start Year</FormLabel>
                        <FormControl>
                          <NumberInput />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                    <FormField name="endYear">
                      <FormItem>
                        <FormLabel>End Year (Optional)</FormLabel>
                        <FormControl>
                          <NumberInput
                            placeholder={RetirementIncomeDialogLabels.lifelongPlaceholder}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
                  </div>
                </div>
              )}
            </div>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Income'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
