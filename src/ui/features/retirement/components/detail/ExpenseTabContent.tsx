import React from 'react';

import { Pencil } from 'lucide-react';

import { ListSectionHeader } from '@/ui/components/ListSectionHeader';
import { RowActions } from '@/ui/components/RowActions';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import {
  RetirementTabContentLabels,
  RetirementWorkspaceTermLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import {
  type RetirementExpenseCategory,
  type RetirementExpenseItemVM,
} from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import RetirementExpenseDialog from '../ExpenseDialog';

interface ExpenseTabContentProps {
  currentYear: number;
  planInflationRate: number;
  expenseItems: Array<{ domain: RetirementExpenseCategory; vm: RetirementExpenseItemVM }>;
  handleAddExpense: (data: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  handleUpdateExpense: (id: string, data: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  handleDeleteExpense: (id: string) => Promise<void>;
  handleImportDebtRepayments: () => Promise<void>;
  handleImportFromLedger: () => Promise<void>;
}

export const ExpenseTabContent: React.FC<ExpenseTabContentProps> = ({
  currentYear,
  planInflationRate,
  expenseItems,
  handleAddExpense,
  handleUpdateExpense,
  handleDeleteExpense,
  handleImportDebtRepayments,
  handleImportFromLedger,
}) => {
  return (
    <div>
      <ListSectionHeader
        className="mb-4"
        title={RetirementWorkspaceTermLabels.expenseCategories}
        count={expenseItems.length}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleImportDebtRepayments}>
              {RetirementTabContentLabels.importDebtRepayments}
            </Button>
            <Button variant="outline" size="sm" onClick={handleImportFromLedger}>
              {RetirementTabContentLabels.importFromLedger}
            </Button>
            <RetirementExpenseDialog
              onSave={handleAddExpense}
              currentYear={currentYear}
              planInflationRate={planInflationRate}
            />
          </>
        }
      />
      {expenseItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">{RetirementTabContentLabels.expenseEmpty}</p>
      ) : (
        <div className="divide-y divide-border">
          {expenseItems.map(({ domain, vm }) => (
            <div key={vm.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-medium">{vm.name}</div>
                  <Badge variant="outline">{vm.typeLabel}</Badge>
                  {vm.debtModeLabel && <Badge variant="outline">{vm.debtModeLabel}</Badge>}
                </div>
                <div className="font-mono text-sm tabular-nums text-muted-foreground">
                  {vm.periodText}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="text-right">
                  <div className="font-mono font-medium tabular-nums">{vm.amountText}</div>
                  <div className="text-sm text-muted-foreground">{vm.growthAndMultiplierText}</div>
                </div>
                <RowActions
                  edit={
                    <RetirementExpenseDialog
                      onSave={(updates) => handleUpdateExpense(domain.id, updates)}
                      currentYear={currentYear}
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
                  onDelete={() => handleDeleteExpense(domain.id)}
                  deleteLabel={RetirementTabContentLabels.deleteAction}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
