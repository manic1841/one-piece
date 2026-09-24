import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';

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
import { Input } from '@/ui/components/ui/input';
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
    name,
    setName,
    amount,
    setAmount,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    retirementMultiplier,
    setRetirementMultiplier,

    handleSubmit,
  } = useRetirementExpenseDialog({
    initialData,
    currentYear,
    onSave,
  });

  const isDebtPayment = initialData?.type === 'debt_payment';
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleOpenChange = (value: boolean) => {
    if (value) setAdvancedOpen(false);
    setOpen(value);
  };

  // Inline preview: retirement-year expense estimate
  const retirementYearPreview = `退休第一年支出約 ${Math.round(amount * (retirementMultiplier / 100)).toLocaleString()} /yr (估算)`;

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
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Row 1: Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries"
              required
            />
          </div>

          {/* Current Annual */}
          <div className="grid gap-2">
            <Label htmlFor="annual">Current Annual ($)</Label>
            <Input
              id="annual"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              readOnly={isDebtPayment}
            />
          </div>
          {isDebtPayment && (
            <p className="text-xs text-muted-foreground">
              {RetirementExpenseDialogLabels.debtDerivedHint}
            </p>
          )}

          {/* Retirement Multiplier */}
          <div className="grid gap-2">
            <Label htmlFor="multiplier">退休後費用比例 (%)</Label>
            <Input
              id="multiplier"
              type="number"
              value={retirementMultiplier}
              onChange={(e) => setRetirementMultiplier(Number(e.target.value))}
              required
            />
          </div>

          {/* Growth: plan inflation default, explicit rate in Advanced */}
          <div className="grid gap-2">
            <Label>{RetirementExpenseDialogLabels.growth}</Label>
            <div className="rounded-md border px-3 py-2 text-sm">
              {growthRate == null
                ? RetirementExpenseDialogLabels.usingPlanInflation(planInflationRate)
                : RetirementExpenseDialogLabels.growthPercent(growthRate)}
            </div>
          </div>

          {/* Duration readout */}
          <div className="grid gap-2">
            <Label>{RetirementExpenseDialogLabels.duration}</Label>
            <div className="rounded-md border px-3 py-2 text-sm">
              {endYear
                ? RetirementExpenseDialogLabels.until(endYear)
                : RetirementExpenseDialogLabels.lifelong}
            </div>
          </div>

          {/* Debt payments keep their end year in the main form */}
          {isDebtPayment && (
            <div className="grid gap-2">
              <Label htmlFor="endYear">End Year</Label>
              <Input
                id="endYear"
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                required
              />
            </div>
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
                <div className="grid gap-2">
                  <Label htmlFor="growth">Growth Rate (%)</Label>
                  <Input
                    id="growth"
                    type="number"
                    step="0.1"
                    value={growthRate ?? ''}
                    onChange={(e) =>
                      setGrowthRate(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                    placeholder={
                      planInflationRate != null
                        ? `Plan inflation ${planInflationRate}%`
                        : 'Plan inflation'
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="startYear">Start Year</Label>
                    <Input
                      id="startYear"
                      type="number"
                      value={startYear}
                      onChange={(e) => setStartYear(Number(e.target.value))}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="endYear">End Year (Optional)</Label>
                    <Input
                      id="endYear"
                      type="number"
                      value={endYear}
                      onChange={(e) => setEndYear(e.target.value)}
                      placeholder={RetirementExpenseDialogLabels.lifelongPlaceholder}
                    />
                  </div>
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
      </DialogContent>
    </Dialog>
  );
}
