import { Plus } from 'lucide-react';

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

import { useRetirementIncomeDialog } from '../hooks/useRetirementIncomeDialog';
import { FixedModeSection } from './income/FixedModeSection';
import { ImportedModeSection } from './income/ImportedModeSection';
import { IncomeFormSharedFields } from './income/IncomeFormSharedFields';

interface IncomeDialogProps {
  onSave: (income: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  currentYear: number;
  initialData?: RetirementIncomeSource;
  trigger?: React.ReactNode;
  householdId: string;
}

export default function IncomeDialog({
  onSave,
  currentYear,
  initialData,
  trigger,
  householdId,
}: IncomeDialogProps) {
  const {
    open,
    setOpen,
    loading,
    calculating,
    name,
    setName,
    type,
    setType,
    amount,
    setAmount,
    growthRate,
    setGrowthRate,
    retirementAnnual,
    setRetirementAnnual,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    startYearMode,
    setStartYearMode,
    endYearMode,
    setEndYearMode,
    lifelong,
    setLifelong,
    autoUpdate,
    setAutoUpdate,
    importedFrom,
    setImportedFrom,
    ledgerCode,
    setLedgerCode,
    sampleYear,
    setSampleYear,
    submitError,
    handleSubmit,
    handleCalculateImported,
  } = useRetirementIncomeDialog({
    initialData,
    currentYear,
    onSave,
    householdId,
  });

  const isImported = importedFrom === 'transactionEntries';

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

          {/* Row 2: Source Mode */}
          <div className="grid gap-2">
            <Label htmlFor="mode">Source</Label>
            <Select
              value={importedFrom}
              onValueChange={(v: 'manual' | 'transactionEntries') => setImportedFrom(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="transactionEntries">Imported (from Ledger)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode-specific sections */}
          {!isImported && (
            <FixedModeSection type={type} setType={setType} amount={amount} setAmount={setAmount} />
          )}

          {isImported && (
            <ImportedModeSection
              ledgerCode={ledgerCode}
              setLedgerCode={setLedgerCode}
              sampleYear={sampleYear}
              setSampleYear={setSampleYear}
              autoUpdate={autoUpdate}
              setAutoUpdate={setAutoUpdate}
              amount={amount}
              type={type}
              setType={setType}
              calculating={calculating}
              onCalculate={handleCalculateImported}
            />
          )}

          {/* Shared fields */}
          <IncomeFormSharedFields
            type={type}
            growthRate={growthRate}
            setGrowthRate={setGrowthRate}
            retirementAnnual={retirementAnnual}
            setRetirementAnnual={setRetirementAnnual}
            startYear={startYear}
            setStartYear={setStartYear}
            startYearMode={startYearMode}
            setStartYearMode={setStartYearMode}
            endYear={endYear}
            setEndYear={setEndYear}
            endYearMode={endYearMode}
            setEndYearMode={setEndYearMode}
            lifelong={lifelong}
            setLifelong={setLifelong}
          />

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <DialogFooter>
            <Button type="submit" disabled={loading || calculating}>
              {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
