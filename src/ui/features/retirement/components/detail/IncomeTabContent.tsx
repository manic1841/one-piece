import React from 'react';

import { Pencil } from 'lucide-react';

import { ListSectionHeader } from '@/ui/components/ListSectionHeader';
import { RowActions } from '@/ui/components/RowActions';
import { Button } from '@/ui/components/ui/button';
import {
  RetirementTabContentLabels,
  RetirementWorkspaceTermLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementIncomeItemVM,
  type RetirementIncomeSource,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import { IncomeEntryEditor } from '../IncomeEntryEditor';

interface IncomeTabContentProps {
  currentYear: number;
  birthYear: number;
  retirementAge: number;
  planInflationRate: number;
  incomeItems: Array<{ domain: RetirementIncomeSource; vm: RetirementIncomeItemVM }>;
  handleAddIncome: (data: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  handleUpdateIncome: (id: string, data: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  handleDeleteIncome: (id: string) => Promise<void>;
  handleImportIncomeFromTransactions: () => Promise<void>;
}

export const IncomeTabContent: React.FC<IncomeTabContentProps> = ({
  currentYear,
  birthYear,
  retirementAge,
  planInflationRate,
  incomeItems,
  handleAddIncome,
  handleUpdateIncome,
  handleDeleteIncome,
  handleImportIncomeFromTransactions,
}) => {
  return (
    <div>
      <ListSectionHeader
        className="mb-4"
        title={RetirementWorkspaceTermLabels.incomeStreams}
        count={incomeItems.length}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleImportIncomeFromTransactions}>
              {RetirementTabContentLabels.importFromLedger}
            </Button>
            <IncomeEntryEditor
              onSave={handleAddIncome}
              currentYear={currentYear}
              birthYear={birthYear}
              retirementAge={retirementAge}
              planInflationRate={planInflationRate}
            />
          </>
        }
      />
      {incomeItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">{RetirementTabContentLabels.incomeEmpty}</p>
      ) : (
        <div className="divide-y divide-border">
          {incomeItems.map(({ domain, vm }) => (
            <div key={vm.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="font-medium">{vm.name}</div>
                <div className="font-mono text-sm tabular-nums text-muted-foreground">
                  {vm.amountText} {vm.growthText} {vm.periodText}
                </div>
                {domain.lifelong && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {RetirementTabContentLabels.lifelong}
                  </div>
                )}
              </div>
              <RowActions
                edit={
                  <IncomeEntryEditor
                    onSave={(updates) => handleUpdateIncome(domain.id, updates)}
                    currentYear={currentYear}
                    birthYear={birthYear}
                    retirementAge={retirementAge}
                    planInflationRate={planInflationRate}
                    initialData={domain}
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={RetirementTabContentLabels.editAction}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />
                }
                onDelete={() => handleDeleteIncome(domain.id)}
                deleteLabel={RetirementTabContentLabels.deleteAction}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
