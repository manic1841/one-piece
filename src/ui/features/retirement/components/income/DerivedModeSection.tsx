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

interface DerivedModeSectionProps {
  baseIncomeId: string | undefined;
  setBaseIncomeId: (id: string) => void;
  multiplier: number;
  setMultiplier: (multiplier: number) => void;
  amount: number;
  calculating: boolean;
  onCalculate: () => Promise<void>;
  availableIncomes: RetirementIncomeSource[];
  initialDataId?: string;
}

export const DerivedModeSection: React.FC<DerivedModeSectionProps> = ({
  baseIncomeId,
  setBaseIncomeId,
  multiplier,
  setMultiplier,
  amount,
  calculating,
  onCalculate,
  availableIncomes,
  initialDataId,
}) => {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor="baseIncome">Base Income Source</Label>
        <Select value={baseIncomeId || ''} onValueChange={(v) => setBaseIncomeId(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select base income..." />
          </SelectTrigger>
          <SelectContent>
            {availableIncomes
              .filter((income) => income.id !== initialDataId)
              .map((income) => (
                <SelectItem key={income.id} value={income.id}>
                  {income.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="multiplier">Multiplier</Label>
        <Input
          id="multiplier"
          type="number"
          step="0.01"
          value={multiplier}
          onChange={(e) => setMultiplier(Number(e.target.value))}
          placeholder="e.g., 1.67 for 2-month bonus"
          required
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        onClick={onCalculate}
        disabled={calculating || !baseIncomeId}
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
    </>
  );
};
