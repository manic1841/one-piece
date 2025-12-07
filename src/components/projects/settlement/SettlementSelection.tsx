import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SettlementSelectionProps {
  year: number;
  month: number;
  setYear: (year: number) => void;
  setMonth: (month: number) => void;
  error?: string;
}

export const SettlementSelection: React.FC<SettlementSelectionProps> = ({
  year,
  month,
  setYear,
  setMonth,
  error,
}) => {
  return (
    <div className="space-y-4 py-4">
      <p className="text-muted-foreground">
        Select the month you want to settle. This will create snapshots for all active projects.
      </p>

      {/* Year & Month */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="year">年份</Label>
          <Input
            id="year"
            type="number"
            required
            min="2000"
            max="2100"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="month">月份</Label>
          <Select value={month.toString()} onValueChange={(val) => setMonth(parseInt(val))}>
            <SelectTrigger id="month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {m}月
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
      )}
    </div>
  );
};
