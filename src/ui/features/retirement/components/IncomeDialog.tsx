import { useState } from 'react';

import { Plus } from 'lucide-react';

import {
  AdvancedDisclosure,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  ReadoutField,
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
import { RetirementIncomeDialogLabels as L } from '@/ui/constants/retirement/incomeDialogLabels';
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
            {L.addAction}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initialData ? L.editTitle : L.createTitle}</DialogTitle>
          <DialogDescription>
            {initialData ? L.editDescription : L.createDescription}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4" noValidate>
            {/* Row 1: Name | Type */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField name="name">
                <FormItem>
                  <FormLabel required>{L.nameLabel}</FormLabel>
                  <FormControl>
                    <TextInput placeholder={L.namePlaceholder} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField name="type">
                <FormItem>
                  <FormLabel required>{L.type}</FormLabel>
                  <FormControl>
                    <SelectField
                      options={RetirementIncomeTypeOptions}
                      placeholder={L.typePlaceholder}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            {/* Row 2: Current Annual (system-derived) | Retirement Annual */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="currentAnnual">{L.currentAnnual}</Label>
                {currentAnnual == null ? (
                  <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {L.noCurrentAnnualMarker}
                  </div>
                ) : (
                  <NumberInput id="currentAnnual" value={String(currentAnnual)} readOnly />
                )}
              </div>

              <FormField name="retirementAnnual">
                <FormItem>
                  <FormLabel>{L.retirementAnnual}</FormLabel>
                  <FormControl>
                    <NumberInput min="0" step="1" placeholder={L.retirementAnnualPlaceholder} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            {currentAnnual == null && (
              <p className="text-xs text-muted-foreground">{L.importHint}</p>
            )}

            {/* Row 3: Growth | Duration readouts */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ReadoutField label={L.growth} value={growthText} />
              <ReadoutField label={L.duration} value={durationText} />
            </div>

            {/* Lifelong toggle */}
            <FormField name="lifelong">
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label htmlFor="lifelong">{L.lifelongLabel}</Label>
                <LifelongToggle />
              </div>
            </FormField>

            {/* Advanced: growth rate + start/end years */}
            <AdvancedDisclosure
              label={L.advanced}
              open={advancedOpen}
              onOpenChange={setAdvancedOpen}
            >
              <FormField name="growthRate">
                <FormItem>
                  <FormLabel>{L.growthRateLabel}</FormLabel>
                  <FormControl>
                    <NumberInput
                      step="0.1"
                      placeholder={
                        planInflationRate != null
                          ? L.planInflation(planInflationRate)
                          : L.planInflationPlaceholder
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField name="startYear">
                  <FormItem>
                    <FormLabel required>{L.startYear}</FormLabel>
                    <FormControl>
                      <NumberInput />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
                <FormField name="endYear">
                  <FormItem>
                    <FormLabel>{L.endYear}</FormLabel>
                    <FormControl>
                      <NumberInput placeholder={L.lifelongPlaceholder} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              </div>
            </AdvancedDisclosure>

            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? L.savingAction : initialData ? L.saveChangesAction : L.addAction}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
