import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';

interface IncomeFormSharedFieldsProps {
  growthRate: number;
  setGrowthRate: (rate: number) => void;
  startYear: number;
  setStartYear: (year: number) => void;
  endYear: number;
  setEndYear: (year: number) => void;
}

export const IncomeFormSharedFields: React.FC<IncomeFormSharedFieldsProps> = ({
  growthRate,
  setGrowthRate,
  startYear,
  setStartYear,
  endYear,
  setEndYear,
}) => {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
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
    </>
  );
};
