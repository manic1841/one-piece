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
  TextInput,
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
import { RetirementExpenseDialogLabels } from '@/ui/constants/retirement/expenseDialogLabels';
import type { RetirementExpenseCategory } from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementExpenseDialog } from '../hooks/useRetirementExpenseDialog';

interface RetirementExpenseDialogProps {
  onSave: (expense: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  currentYear: number;
  planInflationRate: number;
  initialData?: RetirementExpenseCategory;
  trigger?: React.ReactNode;
}

export default function RetirementExpenseDialog({
  onSave,
  currentYear,
  planInflationRate,
  initialData,
  trigger,
}: RetirementExpenseDialogProps) {
  const {
    open,
    setOpen,
    loading,
    form,
    isDebtPayment,
    growthText,
    durationText,
    retirementYearPreview,
    handleSubmit,
  } = useRetirementExpenseDialog({
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
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Expense Category' : 'Add Expense Category'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update the details of this expense category.'
              : 'Add a new expense category manually or import from the ledger.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="grid gap-4 py-4" noValidate>
            {/* Row 1: Name */}
            <FormField name="name">
              <FormItem>
                <FormLabel required>Name</FormLabel>
                <FormControl>
                  <TextInput placeholder="e.g., Groceries" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            {/* Current Annual */}
            <FormField name="currentAnnual">
              <FormItem>
                <FormLabel required>Current Annual ($)</FormLabel>
                <FormControl>
                  <NumberInput readOnly={isDebtPayment} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
            {isDebtPayment && (
              <p className="text-xs text-muted-foreground">
                {RetirementExpenseDialogLabels.debtDerivedHint}
              </p>
            )}

            {/* Retirement Multiplier */}
            <FormField name="retirementMultiplier">
              <FormItem>
                <FormLabel required>退休後費用比例 (%)</FormLabel>
                <FormControl>
                  <NumberInput />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            {/* Growth: plan inflation default, explicit rate in Advanced */}
            <div className="grid gap-2">
              <Label>{RetirementExpenseDialogLabels.growth}</Label>
              <div className="rounded-md border px-3 py-2 text-sm">{growthText}</div>
            </div>

            {/* Duration readout */}
            <div className="grid gap-2">
              <Label>{RetirementExpenseDialogLabels.duration}</Label>
              <div className="rounded-md border px-3 py-2 text-sm">{durationText}</div>
            </div>

            {/* Debt payments keep their end year in the main form */}
            {isDebtPayment && (
              <FormField name="endYear">
                <FormItem>
                  <FormLabel required>End Year</FormLabel>
                  <FormControl>
                    <NumberInput />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            )}

            {/* Advanced: growth rate + start/end years */}
            <div className="grid gap-2">
              <button
                type="button"
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm font-medium"
                onClick={() => setAdvancedOpen((prev) => !prev)}
                aria-expanded={advancedOpen}
              >
                {RetirementExpenseDialogLabels.advanced}
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
                    {/* Debt payments show End Year in their own block above. */}
                    {!isDebtPayment && (
                      <FormField name="endYear">
                        <FormItem>
                          <FormLabel>End Year (Optional)</FormLabel>
                          <FormControl>
                            <NumberInput
                              placeholder={RetirementExpenseDialogLabels.lifelongPlaceholder}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      </FormField>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Retirement year inline preview */}
            <div className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
              {retirementYearPreview}
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Expense'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
