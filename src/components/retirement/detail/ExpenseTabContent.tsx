import React from 'react';

import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { type RetirementExpenseCategory, type RetirementPlan } from '@/domains/retirement/types';
import { formatCurrency } from '@/utils/formatUtils';

import RetirementExpenseDialog from '../ExpenseDialog';

interface ExpenseTabContentProps {
  plan: RetirementPlan;
  handleAddExpense: (data: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  handleUpdateExpense: (id: string, data: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  handleDeleteExpense: (id: string) => Promise<void>;
}

export const ExpenseTabContent: React.FC<ExpenseTabContentProps> = ({
  plan,
  handleAddExpense,
  handleUpdateExpense,
  handleDeleteExpense,
}) => {
  return (
    <div className="rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Expense Categories ({plan.expenses.length})</h3>
        <RetirementExpenseDialog onSave={handleAddExpense} currentYear={plan.currentYear} />
      </div>
      {plan.expenses.length === 0 ? (
        <p className="text-muted-foreground">
          No expenses defined yet. Click Add Expense to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {plan.expenses.map((expense) => (
            <div key={expense.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{expense.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {expense.startYear} - {expense.endYear ?? 'Lifetime'}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(expense.baseAmount)}/yr</div>
                    <div className="text-sm text-muted-foreground">
                      {expense.growthRate}% growth {expense.retirementMultiplier * 100}% after
                      retirement
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <RetirementExpenseDialog
                      onSave={(updates) => handleUpdateExpense(expense.id, updates)}
                      currentYear={plan.currentYear}
                      initialData={expense}
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
                      onClick={() => handleDeleteExpense(expense.id)}
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
