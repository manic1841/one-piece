import { useState } from 'react';

import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { type RetirementAssumptionsDisplayVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import {
  type RetirementAssumptionsFormVM,
  RetirementAssumptionsFormVMSchema,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';

interface AssumptionsFormProps {
  assumptions: RetirementAssumptionsDisplayVM;
  onSave: (updates: RetirementAssumptionsFormVM) => void;
}

const toAssumptionsFormVM = (
  assumptions: RetirementAssumptionsDisplayVM,
): RetirementAssumptionsFormVM => ({
  currentYear: assumptions.currentYear,
  birthYear: assumptions.birthYear,
  retirementAge: assumptions.retirementAge,
  lifeExpectancy: assumptions.lifeExpectancy,
  currentSavings: assumptions.currentSavings,
  salaryGrowthRate: assumptions.salaryGrowthRate,
  inflationRate: assumptions.inflationRate,
  investmentReturnRate: assumptions.investmentReturnRate,
});

const parseNumberOrFallback = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function AssumptionsForm({ assumptions, onSave }: AssumptionsFormProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<RetirementAssumptionsFormVM>(
    toAssumptionsFormVM(assumptions),
  );

  const handleSave = () => {
    const parsed = RetirementAssumptionsFormVMSchema.safeParse(formData);
    if (!parsed.success) {
      return;
    }
    onSave(parsed.data);
    setEditing(false);
  };

  const handleCancel = () => {
    setFormData(toAssumptionsFormVM(assumptions));
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="rounded-lg border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Basic Assumptions</h3>
          <Button onClick={() => setEditing(true)}>Edit</Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Current Year</div>
            <div className="text-lg font-medium">{assumptions.currentYear}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Birth Year</div>
            <div className="text-lg font-medium">{assumptions.birthYear}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Retirement Age</div>
            <div className="text-lg font-medium">{assumptions.retirementAge}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Life Expectancy</div>
            <div className="text-lg font-medium">{assumptions.lifeExpectancy}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Current Savings</div>
            <div className="text-lg font-medium">{assumptions.currentSavingsText}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Salary Growth Rate</div>
            <div className="text-lg font-medium">{assumptions.salaryGrowthRate}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Inflation Rate</div>
            <div className="text-lg font-medium">{assumptions.inflationRate}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Investment Return</div>
            <div className="text-lg font-medium">{assumptions.investmentReturnRate}%</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Edit Assumptions</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currentYear">Current Year</Label>
          <Input
            id="currentYear"
            type="number"
            value={formData.currentYear}
            onChange={(e) =>
              setFormData({
                ...formData,
                currentYear: parseNumberOrFallback(e.target.value, formData.currentYear),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthYear">Birth Year</Label>
          <Input
            id="birthYear"
            type="number"
            value={formData.birthYear}
            onChange={(e) =>
              setFormData({
                ...formData,
                birthYear: parseNumberOrFallback(e.target.value, formData.birthYear),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retirementAge">Retirement Age</Label>
          <Input
            id="retirementAge"
            type="number"
            value={formData.retirementAge}
            onChange={(e) =>
              setFormData({
                ...formData,
                retirementAge: parseNumberOrFallback(e.target.value, formData.retirementAge),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lifeExpectancy">Life Expectancy</Label>
          <Input
            id="lifeExpectancy"
            type="number"
            value={formData.lifeExpectancy}
            onChange={(e) =>
              setFormData({
                ...formData,
                lifeExpectancy: parseNumberOrFallback(e.target.value, formData.lifeExpectancy),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentSavings">Current Savings ($)</Label>
          <Input
            id="currentSavings"
            type="number"
            value={formData.currentSavings}
            onChange={(e) =>
              setFormData({
                ...formData,
                currentSavings: parseNumberOrFallback(e.target.value, formData.currentSavings),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salaryGrowthRate">Salary Growth Rate (%)</Label>
          <Input
            id="salaryGrowthRate"
            type="number"
            step="0.1"
            value={formData.salaryGrowthRate}
            onChange={(e) =>
              setFormData({
                ...formData,
                salaryGrowthRate: parseNumberOrFallback(e.target.value, formData.salaryGrowthRate),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="inflationRate">Inflation Rate (%)</Label>
          <Input
            id="inflationRate"
            type="number"
            step="0.1"
            value={formData.inflationRate}
            onChange={(e) =>
              setFormData({
                ...formData,
                inflationRate: parseNumberOrFallback(e.target.value, formData.inflationRate),
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="investmentReturnRate">Investment Return Rate (%)</Label>
          <Input
            id="investmentReturnRate"
            type="number"
            step="0.1"
            value={formData.investmentReturnRate}
            onChange={(e) =>
              setFormData({
                ...formData,
                investmentReturnRate: parseNumberOrFallback(
                  e.target.value,
                  formData.investmentReturnRate,
                ),
              })
            }
          />
        </div>
      </div>
      <div className="flex gap-2 mt-6">
        <Button onClick={handleSave}>Save</Button>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
