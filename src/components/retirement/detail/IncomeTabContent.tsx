import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type RetirementIncomeSource, type RetirementPlan } from '@/domains/retirement/types';
import { formatCurrency } from '@/utils/formatUtils';

import RetirementIncomeDialog from '../IncomeDialog';

interface IncomeTabContentProps {
  plan: RetirementPlan;
  handleAddIncome: (data: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  handleUpdateIncome: (id: string, data: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  handleDeleteIncome: (id: string) => Promise<void>;
}

export const IncomeTabContent: React.FC<IncomeTabContentProps> = ({
  plan,
  handleAddIncome,
  handleUpdateIncome,
  handleDeleteIncome,
}) => {
  return (
    <div className="rounded-lg border p-6 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Income Sources</h3>
        <RetirementIncomeDialog onSave={handleAddIncome} currentYear={plan.currentYear} />
      </div>

      <div className="space-y-2">
        {plan.incomes.map((income) => (
          <div
            key={income.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div>
              <div className="font-medium">{income.name}</div>
              <div className="text-sm text-muted-foreground">
                {formatCurrency(income.baseAmount)}/yr {income.growthRate}% growth{' '}
                {income.startYear}- {income.endYear}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RetirementIncomeDialog
                onSave={(updates) => handleUpdateIncome(income.id, updates)}
                currentYear={plan.currentYear}
                initialData={income}
                trigger={
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleDeleteIncome(income.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {plan.incomes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            No income sources added yet.
          </div>
        )}
      </div>
    </div>
  );
};
