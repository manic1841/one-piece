import { type RetirementIncomeSource } from '@/domains/retirement/types';
import { Button } from '@/ui/components/ui/button';
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
import { RetirementIncomeTypeOptions } from '@/ui/constants/retirement/retirementLabel';

interface ImportedModeSectionProps {
  ledgerCode: string;
  setLedgerCode: (code: string) => void;
  sampleYear: number;
  setSampleYear: (year: number) => void;
  autoUpdate: boolean;
  setAutoUpdate: (enabled: boolean) => void;
  amount: number;
  type: RetirementIncomeSource['type'];
  setType: (type: RetirementIncomeSource['type']) => void;
  calculating: boolean;
  onCalculate: () => Promise<void>;
}

export const ImportedModeSection: React.FC<ImportedModeSectionProps> = ({
  ledgerCode,
  setLedgerCode,
  sampleYear,
  setSampleYear,
  autoUpdate,
  setAutoUpdate,
  amount,
  type,
  setType,
  calculating,
  onCalculate,
}) => {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="ledgerCode">Ledger Code</Label>
        <Input
          id="ledgerCode"
          value={ledgerCode}
          onChange={(e) => setLedgerCode(e.target.value)}
          placeholder="e.g., income:salary:charles"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sampleYear">Sample Year</Label>
        <Input
          id="sampleYear"
          type="number"
          value={sampleYear}
          onChange={(e) => setSampleYear(Number(e.target.value))}
          required
        />
      </div>

      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <Label htmlFor="autoUpdate">Auto update stale sample year</Label>
        <Switch id="autoUpdate" checked={autoUpdate} onCheckedChange={setAutoUpdate} />
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={onCalculate}
        disabled={calculating || !ledgerCode || !Number.isInteger(sampleYear)}
      >
        {calculating ? 'Calculating...' : '試算'}
      </Button>
      <div className="grid gap-2">
        <Label htmlFor="amount">Annual Amount (Read-only)</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          readOnly
          className="bg-muted"
          placeholder="Click 試算 to calculate"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="type">Type</Label>
        <Select value={type} onValueChange={(v: RetirementIncomeSource['type']) => setType(v)}>
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
    </>
  );
};
