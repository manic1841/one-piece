import { ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';

import { type RetirementIncomeSource } from '@/domains/retirement/types';
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
import { Switch } from '@/ui/components/ui/switch';
import { RetirementIncomeDialogLabels } from '@/ui/constants/retirement/incomeDialogLabels';
import { RetirementIncomeTypeOptions } from '@/ui/constants/retirement/retirementLabel';

import { useRetirementIncomeDialog } from '../hooks/useRetirementIncomeDialog';

interface IncomeDialogProps {
  onSave: (income: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  currentYear: number;
  planInflationRate: number;
  initialData?: RetirementIncomeSource;
  trigger?: React.ReactNode;
}

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
    name,
    setName,
    type,
    setType,
    growthRate,
    setGrowthRate,
    retirementAnnual,
    setRetirementAnnual,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    lifelong,
    setLifelong,
    submitError,
    handleSubmit,
    currentAnnual,
  } = useRetirementIncomeDialog({
    initialData,
    currentYear,
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
          <DialogTitle>
            {initialData ? 'Edit Income Stream' : 'Add Income Stream'}
          </DialogTitle>
          <DialogDescription>
            {initialData ? 'Update the details of this income source.' : 'Add a new income source.'}
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

          {/* Row 2: Type */}
          <div className="grid gap-2">
            <Label htmlFor="type">{RetirementIncomeDialogLabels.type}</Label>
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

          {/* Current Annual: system-derived from the ledger import */}
          <div className="grid gap-2">
            <Label htmlFor="currentAnnual">{RetirementIncomeDialogLabels.currentAnnual}</Label>
            {currentAnnual == null ? (
              <div className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {RetirementIncomeDialogLabels.noCurrentAnnualMarker}
              </div>
            ) : (
              <Input
                id="currentAnnual"
                type="number"
                value={currentAnnual}
                readOnly
              />
            )}
          </div>
          {currentAnnual == null && (
            <p className="text-xs text-muted-foreground">
              {RetirementIncomeDialogLabels.importHint}
            </p>
          )}

          {/* Retirement Annual: user assumption */}
          <div className="grid gap-2">
            <Label htmlFor="retirementAnnual">
              {RetirementIncomeDialogLabels.retirementAnnual}
            </Label>
            <Input
              id="retirementAnnual"
              type="number"
              min="0"
              step="1"
              value={retirementAnnual ?? ''}
              onChange={(e) =>
                setRetirementAnnual(e.target.value === '' ? undefined : Number(e.target.value))
              }
              placeholder="0 for no retirement income"
            />
          </div>

          {/* Growth: plan inflation default, explicit rate in Advanced */}
          <div className="grid gap-2">
            <Label>{RetirementIncomeDialogLabels.growth}</Label>
            <div className="rounded-md border px-3 py-2 text-sm">
              {growthRate == null
                ? RetirementIncomeDialogLabels.usingPlanInflation(planInflationRate)
                : RetirementIncomeDialogLabels.growthPercent(growthRate)}
            </div>
          </div>

          {/* Duration readout */}
          <div className="grid gap-2">
            <Label>{RetirementIncomeDialogLabels.duration}</Label>
            <div className="rounded-md border px-3 py-2 text-sm">
              {lifelong || !endYear
                ? RetirementIncomeDialogLabels.lifelong
                : RetirementIncomeDialogLabels.until(endYear)}
            </div>
          </div>

          {/* Lifelong toggle */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="lifelong">{RetirementIncomeDialogLabels.lifelongLabel}</Label>
            <Switch id="lifelong" checked={lifelong} onCheckedChange={setLifelong} />
          </div>

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
                      onChange={(e) =>
                        setEndYear(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      placeholder={RetirementIncomeDialogLabels.lifelongPlaceholder}
                    />
                  </div>
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
      </DialogContent>
    </Dialog>
  );
}
