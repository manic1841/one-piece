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
import { RetirementIncomeTypeOptions } from '@/ui/constants/retirement/retirementLabel';

interface ImportedModeSectionProps {
  ledgerCode: string;
  setLedgerCode: (code: string) => void;
  sampleStartDate: string;
  setSampleStartDate: (date: string) => void;
  sampleEndDate: string;
  setSampleEndDate: (date: string) => void;
  amount: number;
  type: RetirementIncomeSource['type'];
  setType: (type: RetirementIncomeSource['type']) => void;
  calculating: boolean;
  onCalculate: () => Promise<void>;
}

export const ImportedModeSection: React.FC<ImportedModeSectionProps> = ({
  ledgerCode,
  setLedgerCode,
  sampleStartDate,
  setSampleStartDate,
  sampleEndDate,
  setSampleEndDate,
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
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="sampleStartDate">Start Date</Label>
          <Input
            id="sampleStartDate"
            type="date"
            value={sampleStartDate}
            onChange={(e) => setSampleStartDate(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sampleEndDate">End Date</Label>
          <Input
            id="sampleEndDate"
            type="date"
            value={sampleEndDate}
            onChange={(e) => setSampleEndDate(e.target.value)}
            required
          />
        </div>
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={onCalculate}
        disabled={calculating || !ledgerCode || !sampleStartDate || !sampleEndDate}
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
