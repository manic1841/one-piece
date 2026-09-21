import { Plus } from 'lucide-react';

import type { RetirementExpenseCategory } from '@/domains/retirement/types';
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

import { useRetirementExpenseDialog } from '../hooks/useRetirementExpenseDialog';

interface RetirementExpenseDialogProps {
  onSave: (expense: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  currentYear: number;
  initialData?: RetirementExpenseCategory;
  trigger?: React.ReactNode;
}

export default function RetirementExpenseDialog({
  onSave,
  currentYear,
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

  // Inline preview: retirement-year expense estimate
  const retirementYearPreview = `退休第一年支出約 ${Math.round(amount * (retirementMultiplier / 100)).toLocaleString()} /yr (估算)`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            />
          </div>

          {/* Growth Rate & Retirement Multiplier */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="growth">通膨/成長率 (%)</Label>
              <Input
                id="growth"
                type="number"
                step="0.1"
                value={growthRate}
                onChange={(e) => setGrowthRate(Number(e.target.value))}
                placeholder="Inflation"
              />
            </div>
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
          </div>

          {/* Start / End Year */}
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
                placeholder="Lifetime"
              />
            </div>
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
