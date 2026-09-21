import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import type { RetirementExpenseCategory } from '@/domains/retirement/types';
import { Button } from '@/ui/components/ui/button';
import { RetirementWorkspaceTermLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { type RetirementExpenseItemVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

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
    <div className="rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          {RetirementWorkspaceTermLabels.expenseCategories} ({expenseItems.length})
        </h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImportDebtRepayments}>
            匯入債務還款
          </Button>
          <Button variant="outline" onClick={handleImportFromLedger}>
            Import from Ledger
          </Button>
          <RetirementExpenseDialog
            onSave={handleAddExpense}
            currentYear={currentYear}
            planInflationRate={planInflationRate}
          />
        </div>
      </div>
      {expenseItems.length === 0 ? (
        <p className="text-muted-foreground">
          No expense categories defined yet. Click Add Expense to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {expenseItems.map(({ domain, vm }) => (
            <div key={vm.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-medium">{vm.name}</div>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {vm.modeLabel}
                    </span>
                    {vm.retirementModeLabel && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-positive/15 text-positive">
                        {vm.retirementModeLabel}
                      </span>
                    )}
                    {vm.expenseTypeLabel && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                        {vm.expenseTypeLabel}
                      </span>
                    )}
                    {vm.debtModeLabel && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                        {vm.debtModeLabel}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{vm.periodText}</div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">{vm.amountText}</div>
                    <div className="text-sm text-muted-foreground">
                      {vm.growthAndMultiplierText}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <RetirementExpenseDialog
                      onSave={(updates) => handleUpdateExpense(domain.id, updates)}
                      currentYear={currentYear}
                      planInflationRate={planInflationRate}
                      initialData={domain}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteExpense(domain.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
