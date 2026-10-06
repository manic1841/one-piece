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
import { RetirementExpenseDialogLabels as L } from '@/ui/constants/retirement/expenseDialogLabels';
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
            {/* Row 1: Name | Current Annual */}
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

              <FormField name="currentAnnual">
                <FormItem>
                  <FormLabel required>{L.currentAnnual}</FormLabel>
                  <FormControl>
                    <NumberInput readOnly={isDebtPayment} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>
            {isDebtPayment && <p className="text-xs text-muted-foreground">{L.debtDerivedHint}</p>}

            {/* Row 2: Retirement Multiplier | Growth readout */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField name="retirementMultiplier">
                <FormItem>
                  <FormLabel required>{L.retirementMultiplier}</FormLabel>
                  <FormControl>
                    <NumberInput />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <ReadoutField label={L.growth} value={growthText} />
            </div>

            {/* Row 3: Duration readout | End Year (debt payments only) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ReadoutField label={L.duration} value={durationText} />

              {/* Debt payments keep their end year in the main form */}
              {isDebtPayment && (
                <FormField name="endYear">
                  <FormItem>
                    <FormLabel required>{L.endYearRequired}</FormLabel>
                    <FormControl>
                      <NumberInput />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </FormField>
              )}
            </div>

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
                {/* Debt payments show End Year in their own block above. */}
                {!isDebtPayment && (
                  <FormField name="endYear">
                    <FormItem>
                      <FormLabel>{L.endYearOptional}</FormLabel>
                      <FormControl>
                        <NumberInput placeholder={L.lifelongPlaceholder} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                )}
              </div>
            </AdvancedDisclosure>

            {/* Retirement year inline preview */}
            <div className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
              {retirementYearPreview}
            </div>

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
