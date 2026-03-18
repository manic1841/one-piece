import { useState } from 'react';

import { type RetirementPlan } from '@/domains/retirement/types';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';

interface AssumptionsFormProps {
  plan: RetirementPlan;
  onSave: (updates: Partial<RetirementPlan>) => void;
}

export default function AssumptionsForm({ plan, onSave }: AssumptionsFormProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    currentYear: plan.currentYear,
    birthYear: plan.birthYear,
    retirementAge: plan.retirementAge,
    lifeExpectancy: plan.lifeExpectancy,
    currentSavings: plan.currentSavings,
    salaryGrowthRate: plan.salaryGrowthRate,
    inflationRate: plan.inflationRate,
    investmentReturnRate: plan.investmentReturnRate,
  });

  const handleSave = () => {
    onSave(formData);
    setEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      currentYear: plan.currentYear,
      birthYear: plan.birthYear,
      retirementAge: plan.retirementAge,
      lifeExpectancy: plan.lifeExpectancy,
      currentSavings: plan.currentSavings,
      salaryGrowthRate: plan.salaryGrowthRate,
      inflationRate: plan.inflationRate,
      investmentReturnRate: plan.investmentReturnRate,
    });
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
            <div className="text-lg font-medium">{plan.currentYear}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Birth Year</div>
            <div className="text-lg font-medium">{plan.birthYear}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Retirement Age</div>
            <div className="text-lg font-medium">{plan.retirementAge}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Life Expectancy</div>
            <div className="text-lg font-medium">{plan.lifeExpectancy}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Current Savings</div>
            <div className="text-lg font-medium">${plan.currentSavings.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Salary Growth Rate</div>
            <div className="text-lg font-medium">{plan.salaryGrowthRate}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Inflation Rate</div>
            <div className="text-lg font-medium">{plan.inflationRate}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Investment Return</div>
            <div className="text-lg font-medium">{plan.investmentReturnRate}%</div>
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
            onChange={(e) => setFormData({ ...formData, currentYear: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="birthYear">Birth Year</Label>
          <Input
            id="birthYear"
            type="number"
            value={formData.birthYear}
            onChange={(e) => setFormData({ ...formData, birthYear: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retirementAge">Retirement Age</Label>
          <Input
            id="retirementAge"
            type="number"
            value={formData.retirementAge}
            onChange={(e) => setFormData({ ...formData, retirementAge: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lifeExpectancy">Life Expectancy</Label>
          <Input
            id="lifeExpectancy"
            type="number"
            value={formData.lifeExpectancy}
            onChange={(e) => setFormData({ ...formData, lifeExpectancy: parseInt(e.target.value) })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentSavings">Current Savings ($)</Label>
          <Input
            id="currentSavings"
            type="number"
            value={formData.currentSavings}
            onChange={(e) =>
              setFormData({ ...formData, currentSavings: parseFloat(e.target.value) })
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
              setFormData({ ...formData, salaryGrowthRate: parseFloat(e.target.value) })
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
              setFormData({ ...formData, inflationRate: parseFloat(e.target.value) })
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
              setFormData({ ...formData, investmentReturnRate: parseFloat(e.target.value) })
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
