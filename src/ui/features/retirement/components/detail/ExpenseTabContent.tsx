import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
} from '@/domains/retirement/types';
import { Button } from '@/ui/components/ui/button';
import { type RetirementExpenseItemVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import RetirementExpenseDialog from '../ExpenseDialog';

interface ExpenseTabContentProps {
  currentYear: number;
  expenseItems: Array<{ domain: RetirementExpenseCategory; vm: RetirementExpenseItemVM }>;
  incomes: RetirementIncomeSource[];
  handleAddExpense: (data: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  handleUpdateExpense: (id: string, data: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  handleDeleteExpense: (id: string) => Promise<void>;
  handleImportDebtRepayments: () => Promise<void>;
}

export const ExpenseTabContent: React.FC<ExpenseTabContentProps> = ({
  currentYear,
  expenseItems,
  incomes,
  handleAddExpense,
  handleUpdateExpense,
  handleDeleteExpense,
  handleImportDebtRepayments,
}) => {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Expense Categories ({expenseItems.length})</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImportDebtRepayments}>
            匯入債務還款
          </Button>
          <RetirementExpenseDialog
            onSave={handleAddExpense}
            currentYear={currentYear}
            incomes={incomes}
          />
        </div>
      </div>
      {expenseItems.length === 0 ? (
        <p className="text-muted-foreground">
          No expenses defined yet. Click Add Expense to get started.
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
                      <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        {vm.retirementModeLabel}
                      </span>
                    )}
                    {vm.expenseTypeLabel && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        {vm.expenseTypeLabel}
                      </span>
                    )}
                    {vm.debtModeLabel && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
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
                      initialData={domain}
                      incomes={incomes}
                      trigger={
                        <Button variant="ghost" size="icon">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
