import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { RetirementWorkspaceTermLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { Button } from '@/ui/components/ui/button';
import {
  type RetirementIncomeItemVM,
  type RetirementIncomeSource,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import RetirementIncomeDialog from '../IncomeDialog';

interface IncomeTabContentProps {
  currentYear: number;
  planInflationRate: number;
  incomeItems: Array<{ domain: RetirementIncomeSource; vm: RetirementIncomeItemVM }>;
  handleAddIncome: (data: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  handleUpdateIncome: (id: string, data: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  handleDeleteIncome: (id: string) => Promise<void>;
  handleImportIncomeFromTransactions: () => Promise<void>;
}

export const IncomeTabContent: React.FC<IncomeTabContentProps> = ({
  currentYear,
  planInflationRate,
  incomeItems,
  handleAddIncome,
  handleUpdateIncome,
  handleDeleteIncome,
  handleImportIncomeFromTransactions,
}) => {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {RetirementWorkspaceTermLabels.incomeStreams} ({incomeItems.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImportIncomeFromTransactions}>
            Import from Ledger
          </Button>
          <RetirementIncomeDialog
            onSave={handleAddIncome}
            currentYear={currentYear}
            planInflationRate={planInflationRate}
          />
        </div>
      </div>
      {incomeItems.length === 0 ? (
        <p className="text-muted-foreground">
          No income streams added yet. Import from the ledger or click Add Income to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {incomeItems.map(({ domain, vm }) => (
            <div key={vm.id} className="flex items-center justify-between border rounded p-4">
              <div>
                <div className="font-medium">{vm.name}</div>
                <div className="text-sm text-muted-foreground">
                  {vm.amountText} {vm.growthText} {vm.periodText}
                </div>
                {domain.lifelong && (
                  <div className="mt-1 text-xs text-muted-foreground">終身</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <RetirementIncomeDialog
                  onSave={(updates) => handleUpdateIncome(domain.id, updates)}
                  currentYear={currentYear}
                  planInflationRate={planInflationRate}
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
        </div>
      )}
    </div>
  );
};
