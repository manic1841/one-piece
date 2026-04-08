import { type RetirementIncomeSource } from '@/domains/retirement/types';
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

interface FixedModeSectionProps {
  type: RetirementIncomeSource['type'];
  setType: (type: RetirementIncomeSource['type']) => void;
  amount: number;
  setAmount: (amount: number) => void;
}

export const FixedModeSection: React.FC<FixedModeSectionProps> = ({
  type,
  setType,
  amount,
  setAmount,
}) => {
  return (
    <>
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
      <div className="grid gap-2">
        <Label htmlFor="amount">Annual Amount</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="e.g., 50000"
          required
        />
      </div>
    </>
  );
};
