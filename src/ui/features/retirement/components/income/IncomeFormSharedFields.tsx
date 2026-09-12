import type { RetirementIncomeSource } from '@/domains/retirement/types';
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

interface IncomeFormSharedFieldsProps {
  type: RetirementIncomeSource['type'];
  growthRate: number;
  setGrowthRate: (rate: number) => void;
  startYear: number;
  setStartYear: (year: number) => void;
  startYearMode: 'MANUAL' | 'LINKED_TO_RETIREMENT';
  setStartYearMode: (mode: 'MANUAL' | 'LINKED_TO_RETIREMENT') => void;
  endYear: number;
  setEndYear: (year: number) => void;
  endYearMode: 'MANUAL' | 'LINKED_TO_RETIREMENT';
  setEndYearMode: (mode: 'MANUAL' | 'LINKED_TO_RETIREMENT') => void;
  lifelong: boolean;
  setLifelong: (enabled: boolean) => void;
}

export const IncomeFormSharedFields: React.FC<IncomeFormSharedFieldsProps> = ({
  type,
  growthRate,
  setGrowthRate,
  startYear,
  setStartYear,
  startYearMode,
  setStartYearMode,
  endYear,
  setEndYear,
  endYearMode,
  setEndYearMode,
  lifelong,
  setLifelong,
}) => {
  const showLinkedStartMode = type === 'pension';
  const showLinkedEndMode = type === 'salary' || type === 'bonus';

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
          {showLinkedStartMode ? (
            <Select
              value={startYearMode}
              onValueChange={(v: 'MANUAL' | 'LINKED_TO_RETIREMENT') => setStartYearMode(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select start year mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="LINKED_TO_RETIREMENT">Linked to retirement year</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="startYear"
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              required
            />
          )}
          {showLinkedStartMode && startYearMode === 'MANUAL' && (
            <Input
              id="startYear"
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              required
            />
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endYear">End Year</Label>
          {showLinkedEndMode && (
            <Select
              value={endYearMode}
              onValueChange={(v: 'MANUAL' | 'LINKED_TO_RETIREMENT') => setEndYearMode(v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select end year mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="LINKED_TO_RETIREMENT">Linked to retirement year</SelectItem>
              </SelectContent>
            </Select>
          )}

          {type === 'pension' && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label htmlFor="lifelong">Lifelong</Label>
              <Switch id="lifelong" checked={lifelong} onCheckedChange={setLifelong} />
            </div>
          )}

          {!lifelong && endYearMode === 'MANUAL' && (
            <Input
              id="endYear"
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              required
            />
          )}
        </div>
      </div>
    </>
  );
};
