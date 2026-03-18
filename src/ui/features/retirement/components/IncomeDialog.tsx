import { Info, Plus } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import { type RetirementIncomeSource } from '@/domains/retirement/types';
import { RetirementIncomeTypeOptions } from '@/ui/constants/retirement/retirementLabel';

import { useRetirementIncomeDialog } from './useRetirementIncomeDialog';

interface RetirementIncomeDialogProps {
  onSave: (income: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  currentYear: number;
  initialData?: RetirementIncomeSource;
  trigger?: React.ReactNode;
}

export default function IncomeDialog({
  onSave,
  currentYear,
  initialData,
  trigger,
}: RetirementIncomeDialogProps) {
  const {
    open,
    setOpen,
    loading,
    name,
    setName,
    type,
    setType,
    amount,
    setAmount,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    selectedCategory,
    categories,
    calculatedFrom,
    importedFrom,
    setImportedFrom,
    importStartDate,
    setImportStartDate,
    importEndDate,
    setImportEndDate,
    importSampleCount,
    setImportSampleCount,
    handleCategoryChange,
    handleSubmit,
  } = useRetirementIncomeDialog({
    initialData,
    currentYear,
    onSave,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Income
          </Button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Income Source' : 'Add Income Source'}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update the details of this income source.'
              : 'Add a new income source manually or import from planned income.'}
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
              placeholder="e.g., Salary"
              required
            />
          </div>

          {/* Row 2: Data Source Selection */}
          <div className="grid gap-2">
            <Label htmlFor="importedFrom">Data Source</Label>
            <Select
              value={importedFrom}
              onValueChange={(v: 'manual' | 'plannedIncome') => {
                setImportedFrom(v);
                if (v === 'manual') handleCategoryChange('none');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual Entry</SelectItem>
                <SelectItem value="plannedIncome">Import from Planned Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 3: Type & Category (if plannedIncome) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={type}
                onValueChange={(v: RetirementIncomeSource['type']) => setType(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {RetirementIncomeTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {importedFrom === 'plannedIncome' && (
              <div className="grid gap-2">
                <Label htmlFor="category">Planned Income Category</Label>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Calculated Info (if imported) */}
          {importedFrom === 'plannedIncome' && (
            <div className="rounded-md border bg-muted/50 p-3 text-xs shadow-sm">
              <div className="mb-3 flex items-center gap-2 font-semibold text-primary">
                <Info size={14} className="text-blue-500" />
                <span>Flexible Import Calculation</span>
              </div>

              <div className="grid gap-3">
                {/* Date Range Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="importStartDate"
                      className="text-[10px] uppercase font-bold text-muted-foreground/80"
                    >
                      Calculation Start
                    </Label>
                    <Input
                      id="importStartDate"
                      type="date"
                      value={importStartDate}
                      onChange={(e) => setImportStartDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="importEndDate"
                      className="text-[10px] uppercase font-bold text-muted-foreground/80"
                    >
                      Calculation End
                    </Label>
                    <Input
                      id="importEndDate"
                      type="date"
                      value={importEndDate}
                      onChange={(e) => setImportEndDate(e.target.value)}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                {/* Sample Count & Result */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="grid gap-1.5">
                    <Label
                      htmlFor="sampleCount"
                      className="text-[10px] uppercase font-bold text-muted-foreground/80"
                    >
                      Multiplier (e.g. 12mo)
                    </Label>
                    <Input
                      id="sampleCount"
                      type="number"
                      value={importSampleCount}
                      onChange={(e) => setImportSampleCount(Number(e.target.value))}
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2 border border-blue-100 dark:border-blue-800">
                      <div className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-bold leading-none mb-1">
                        Monthly Avg
                      </div>
                      <div className="font-mono font-bold text-base text-blue-700 dark:text-blue-300">
                        ${Math.round(calculatedFrom?.monthlyAverage || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {calculatedFrom && (
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground bg-muted p-1.5 rounded animate-in fade-in duration-300">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      Found {calculatedFrom.sampleCount} records
                    </span>
                    <span className="font-medium">
                      Total: ${calculatedFrom.totalAmount.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Row 3: Annual Amount & Growth Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Annual Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="growth">Growth Rate (%)</Label>
              <Input
                id="growth"
                type="number"
                step="0.1"
                value={growthRate}
                onChange={(e) => setGrowthRate(Number(e.target.value))}
                required
              />
            </div>
          </div>

          {/* Row 4: Start Year & End Year */}
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
              <Label htmlFor="endYear">End Year</Label>
              <Input
                id="endYear"
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
