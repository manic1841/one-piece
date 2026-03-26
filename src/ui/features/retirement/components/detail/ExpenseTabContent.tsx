import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { type RetirementExpenseCategory } from '@/domains/retirement/types';
import { Button } from '@/ui/components/ui/button';
import { type RetirementExpenseItemVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';

import RetirementExpenseDialog from '../ExpenseDialog';

interface ExpenseTabContentProps {
  currentYear: number;
  expenseItems: Array<{ domain: RetirementExpenseCategory; vm: RetirementExpenseItemVM }>;
  handleAddExpense: (data: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  handleUpdateExpense: (id: string, data: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  handleDeleteExpense: (id: string) => Promise<void>;
  handleImportFromProjects: () => Promise<void>;
}

export const ExpenseTabContent: React.FC<ExpenseTabContentProps> = ({
  currentYear,
  expenseItems,
  handleAddExpense,
  handleUpdateExpense,
  handleDeleteExpense,
  handleImportFromProjects,
}) => {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Expense Categories ({expenseItems.length})</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleImportFromProjects}>
            Import from Projects
          </Button>
          <RetirementExpenseDialog onSave={handleAddExpense} currentYear={currentYear} />
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
                  <div className="font-medium">{vm.name}</div>
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
