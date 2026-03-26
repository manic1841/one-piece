import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { type RetirementIncomeSource } from '@/domains/retirement/types';
import { Button } from '@/ui/components/ui/button';
import { type RetirementIncomeItemVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import RetirementIncomeDialog from '../IncomeDialog';

interface IncomeTabContentProps {
  currentYear: number;
  incomeItems: Array<{ domain: RetirementIncomeSource; vm: RetirementIncomeItemVM }>;
  handleAddIncome: (data: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  handleUpdateIncome: (id: string, data: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  handleDeleteIncome: (id: string) => Promise<void>;
}

export const IncomeTabContent: React.FC<IncomeTabContentProps> = ({
  currentYear,
  incomeItems,
  handleAddIncome,
  handleUpdateIncome,
  handleDeleteIncome,
}) => {
  return (
    <div className="rounded-lg border p-6 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Income Sources</h3>
        <RetirementIncomeDialog onSave={handleAddIncome} currentYear={currentYear} />
      </div>

      <div className="space-y-2">
        {incomeItems.map(({ domain, vm }) => (
          <div
            key={vm.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div>
              <div className="font-medium">{vm.name}</div>
              <div className="text-sm text-muted-foreground">
                {vm.amountText} {vm.growthText} {vm.periodText}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <RetirementIncomeDialog
                onSave={(updates) => handleUpdateIncome(domain.id, updates)}
                currentYear={currentYear}
                initialData={domain}
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
                onClick={() => handleDeleteIncome(domain.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {incomeItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            No income sources added yet.
          </div>
        )}
      </div>
    </div>
  );
};
