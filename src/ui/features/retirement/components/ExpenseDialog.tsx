import { Plus } from 'lucide-react';

import { CalculationMode, SalaryPercentageRetirementMode } from '@/domains/retirement/schemas';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
} from '@/domains/retirement/types';
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

import { useRetirementExpenseDialog } from '../hooks/useRetirementExpenseDialog';

interface RetirementExpenseDialogProps {
  onSave: (expense: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  currentYear: number;
  initialData?: RetirementExpenseCategory;
  trigger?: React.ReactNode;
  incomes?: RetirementIncomeSource[];
}

const ALL_SALARY_OPTION_VALUE = '__all_salary__';

export default function RetirementExpenseDialog({
  onSave,
  currentYear,
  initialData,
  trigger,
  incomes = [],
}: RetirementExpenseDialogProps) {
  const {
    open,
    setOpen,
    loading,
    name,
    setName,
    amount,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    retirementMultiplier,
    setRetirementMultiplier,
    calculationMode,
    setCalculationMode,
    salaryPercentage,
    setSalaryPercentage,
    salaryPercentageRetirementMode,
    setSalaryPercentageRetirementMode,
    linkedIncomeId,
    setLinkedIncomeId,
    fallbackAmount,
    setFallbackAmount,

    handleSubmit,
  } = useRetirementExpenseDialog({
    initialData,
    currentYear,
    onSave,
    incomes,
  });

  const isPercentage = calculationMode === CalculationMode.SALARY_PERCENTAGE;

  // Inline preview: retirement-year expense estimate
  const retirementYearPreview = (() => {
    if (isPercentage) {
      if (salaryPercentageRetirementMode === SalaryPercentageRetirementMode.MANUAL_FALLBACK) {
        return fallbackAmount > 0
          ? `退休第一年支出約 ${fallbackAmount.toLocaleString()} /yr`
          : null;
      }
      return '退休後支出將以退休第一年估算值為基準，依通膨率逐年調整';
    }
    return `退休第一年支出約 ${Math.round(amount * Math.pow(1 + growthRate / 100, currentYear + 20 - currentYear) * (retirementMultiplier / 100)).toLocaleString()} /yr (估算)`;
  })();

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
              : 'Add a new expense category manually or import from an existing project.'}
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

          {/* Row 2: Calculation Mode Toggle */}
          <div className="grid gap-2">
            <Label>計算模式</Label>
            <div className="flex rounded-md border overflow-hidden">
              <button
                type="button"
                onClick={() => setCalculationMode(CalculationMode.FIXED)}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                  !isPercentage
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                固定金額
              </button>
              <button
                type="button"
                onClick={() => setCalculationMode(CalculationMode.SALARY_PERCENTAGE)}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors border-l ${
                  isPercentage
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                薪資比例
              </button>
            </div>
          </div>

          {/* Dynamic fields by mode */}
          {
            /* SALARY_PERCENTAGE mode */
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="salaryPct">薪資比例 (%)</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="salaryPct"
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={salaryPercentage}
                    onChange={(e) => setSalaryPercentage(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-12 text-right text-sm font-medium tabular-nums">
                    {salaryPercentage}%
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="linkedIncome">連結收入來源</Label>
                  <Select
                    value={linkedIncomeId ?? ALL_SALARY_OPTION_VALUE}
                    onValueChange={(v) =>
                      setLinkedIncomeId(v === ALL_SALARY_OPTION_VALUE ? undefined : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_SALARY_OPTION_VALUE}>所有薪資收入合計</SelectItem>
                      {incomes
                        .filter((income) => income.type === 'salary')
                        .map((income) => (
                          <SelectItem key={income.id} value={income.id}>
                            {income.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="retMode">退休後計算</Label>
                  <Select
                    value={salaryPercentageRetirementMode}
                    onValueChange={(v: SalaryPercentageRetirementMode) =>
                      setSalaryPercentageRetirementMode(v)
                    }
                  >
                    <SelectTrigger id="retMode">
                      <SelectValue placeholder="Select mode..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SalaryPercentageRetirementMode.MANUAL_FALLBACK}>
                        手動輸入保底金額
                      </SelectItem>
                      <SelectItem value={SalaryPercentageRetirementMode.INFLATION_BASED}>
                        直接按通膨率推估
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {salaryPercentageRetirementMode ===
                SalaryPercentageRetirementMode.MANUAL_FALLBACK && (
                <div className="grid gap-2">
                  <Label htmlFor="fallback">退休後保底年度支出</Label>
                  <Input
                    id="fallback"
                    type="number"
                    value={fallbackAmount}
                    onChange={(e) => setFallbackAmount(Number(e.target.value))}
                    placeholder="0"
                  />
                </div>
              )}
            </div>
          }

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
                required
              />
            </div>
            {!isPercentage && (
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
            )}
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
          {retirementYearPreview && (
            <div className="rounded-md bg-muted px-4 py-2 text-sm text-muted-foreground">
              {retirementYearPreview}
            </div>
          )}

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
