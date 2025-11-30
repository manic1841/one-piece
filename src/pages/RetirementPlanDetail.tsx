import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Calculator, Pencil } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import AssumptionsForm from '../components/retirement/AssumptionsForm';
import RetirementProjectionChart from '../components/retirement/RetirementProjectionChart';
import RetirementYearlyTable from '../components/retirement/RetirementYearlyTable';
import AddEventDialog from '../components/retirement/AddEventDialog';
import AddRetirementExpenseDialog from '../components/retirement/AddRetirementExpenseDialog';
import AddRetirementIncomeDialog from '../components/retirement/AddRetirementIncomeDialog';
import { retirementPlanService } from '../services/retirementPlanService';
import {
  calculateRetirementProjection,
  calculateProjectionSummary,
} from '../domains/finance/calculators/retirementCalculator';
import { useAuth } from '../contexts/useAuth';
import type { RetirementPlan } from '../schemas/retirementPlan';
import { Timestamp } from 'firebase/firestore';

export default function RetirementPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [plan, setPlan] = useState<RetirementPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const loadPlan = useCallback(async () => {
    if (!id || !userProfile?.householdId) return;
    try {
      const data = await retirementPlanService.getById(userProfile.householdId, id);
      if (data) {
        setPlan(data);
        setEditedName(data.name);
      }
    } catch (error) {
      console.error('Failed to load plan', error);
    } finally {
      setLoading(false);
    }
  }, [id, userProfile?.householdId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleUpdatePlan = async (updates: Partial<RetirementPlan>) => {
    if (!id || !userProfile?.householdId || !plan) return;
    try {
      await retirementPlanService.updateRetirementPlan(userProfile.householdId, id, updates);
      await loadPlan();
    } catch (error) {
      console.error('Failed to update plan', error);
    }
  };

  const handleRecalculate = async () => {
    if (!id || !userProfile?.householdId || !plan) return;
    try {
      const projection = calculateRetirementProjection(plan);
      const summary = calculateProjectionSummary(projection, plan);

      await retirementPlanService.updateRetirementPlan(userProfile.householdId, id, {
        summary: {
          ...summary,
          lastCalculatedAt: Timestamp.now(),
        },
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to recalculate', error);
    }
  };

  const handleAddExpense = async (
    expenseData: Omit<import('../schemas/retirementPlan').RetirementExpenseCategory, 'id'>,
  ) => {
    if (!id || !userProfile?.householdId || !plan) return;
    try {
      const newExpense = {
        ...expenseData,
        id: crypto.randomUUID(),
      };

      const updatedExpenses = [...plan.expenses, newExpense];
      await retirementPlanService.updateRetirementPlan(userProfile.householdId, id, {
        expenses: updatedExpenses,
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to add expense:', error);
    }
  };

  const handleUpdateExpense = async (
    expenseId: string,
    updates: Omit<import('../schemas/retirementPlan').RetirementExpenseCategory, 'id'>,
  ) => {
    if (!id || !userProfile?.householdId || !plan) return;
    try {
      const updatedExpenses = plan.expenses.map((e) =>
        e.id === expenseId ? { ...updates, id: expenseId } : e,
      );

      await retirementPlanService.updateRetirementPlan(userProfile.householdId, id, {
        expenses: updatedExpenses,
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to update expense:', error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!id || !userProfile?.householdId || !plan) return;
    if (!window.confirm('Are you sure you want to delete this expense category?')) return;

    try {
      const updatedExpenses = plan.expenses.filter((e) => e.id !== expenseId);
      await retirementPlanService.updateRetirementPlan(userProfile.householdId, id, {
        expenses: updatedExpenses,
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to delete expense:', error);
    }
  };

  const handleAddEvent = async (
    eventData: Omit<import('../schemas/retirementPlan').RetirementOneTimeEvent, 'id'>,
  ) => {
    if (!id || !userProfile?.householdId || !plan) return;
    try {
      const newEvent = {
        ...eventData,
        id: `event-${Date.now()}`,
      };

      const updatedEvents = [...plan.events, newEvent];
      await retirementPlanService.updateRetirementPlan(userProfile.householdId, id, {
        events: updatedEvents,
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to add event:', error);
    }
  };

  const handleDelete = async () => {
    if (!id || !userProfile?.householdId || !window.confirm('Delete this plan?')) return;
    try {
      await retirementPlanService.deleteRetirementPlan(userProfile.householdId, id);
      navigate('/retirement');
    } catch (error) {
      console.error('Failed to delete plan', error);
    }
  };

  const handleSaveName = async () => {
    if (!id || !userProfile?.householdId || !plan || !editedName.trim()) return;
    try {
      await retirementPlanService.updateRetirementPlan(userProfile.householdId, id, {
        name: editedName.trim(),
      });
      await loadPlan();
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to update plan name', error);
    }
  };

  const handleCancelEditName = () => {
    setEditedName(plan?.name || '');
    setIsEditingName(false);
  };

  const handleAddIncome = async (
    incomeData: Omit<import('../schemas/retirementPlan').RetirementIncomeSource, 'id'>,
  ) => {
    if (!id || !userProfile?.householdId || !plan) return;
    try {
      const newIncome = {
        ...incomeData,
        id: crypto.randomUUID(),
      };

      const updatedIncomes = [...plan.incomes, newIncome];
      await retirementPlanService.updateRetirementPlan(userProfile.householdId, id, {
        incomes: updatedIncomes,
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to add income:', error);
    }
  };

  const handleUpdateIncome = async (
    incomeId: string,
    updates: Omit<import('../schemas/retirementPlan').RetirementIncomeSource, 'id'>,
  ) => {
    if (!id || !userProfile?.householdId || !plan) return;
    try {
      const updatedIncomes = plan.incomes.map((i) =>
        i.id === incomeId ? { ...updates, id: incomeId } : i,
      );

      await retirementPlanService.updateRetirementPlan(userProfile.householdId, id, {
        incomes: updatedIncomes,
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to update income:', error);
    }
  };

  const handleDeleteIncome = async (incomeId: string) => {
    if (!id || !userProfile?.householdId || !plan) return;
    if (!window.confirm('Are you sure you want to delete this income source?')) return;

    try {
      const updatedIncomes = plan.incomes.filter((i) => i.id !== incomeId);
      await retirementPlanService.updateRetirementPlan(userProfile.householdId, id, {
        incomes: updatedIncomes,
      });
      await loadPlan();
    } catch (error) {
      console.error('Failed to delete income:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!plan) {
    return <div className="p-8">Plan not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={() => navigate('/retirement')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-2xl font-bold h-auto py-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                    if (e.key === 'Escape') handleCancelEditName();
                  }}
                />
                <Button size="sm" onClick={handleSaveName}>
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancelEditName}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold">{plan.name}</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsEditingName(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
            <p className="text-muted-foreground">
              Retire at {plan.retirementAge}, life expectancy {plan.lifeExpectancy}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRecalculate}>
            <Calculator className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs defaultValue="assumptions" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="assumptions" className="space-y-4">
          <AssumptionsForm plan={plan} onSave={handleUpdatePlan} />
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
          <div className="rounded-lg border p-6 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Income Sources</h3>
              <AddRetirementIncomeDialog onSave={handleAddIncome} currentYear={plan.currentYear} />
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
                      {income.baseAmount.toLocaleString()}/yr • {income.growthRate}% growth •{' '}
                      {income.startYear}-{income.endYear}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AddRetirementIncomeDialog
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
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="rounded-lg border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Expense Categories ({plan.expenses.length})</h3>
              <AddRetirementExpenseDialog
                onSave={handleAddExpense}
                currentYear={plan.currentYear}
              />
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
                          <div className="font-medium">
                            ${expense.baseAmount.toLocaleString()}/yr
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {expense.growthRate}% growth • {expense.retirementMultiplier * 100}%
                            after retirement
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <AddRetirementExpenseDialog
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
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="rounded-lg border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">One-Time Events ({plan.events.length})</h3>
              <AddEventDialog onAdd={handleAddEvent} currentYear={plan.currentYear} />
            </div>
            {plan.events.length === 0 ? (
              <p className="text-muted-foreground">No events defined yet.</p>
            ) : (
              <div className="space-y-2">
                {plan.events.map((event) => (
                  <div key={event.id} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{event.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {event.year} • {event.type}
                        </div>
                      </div>
                      <div
                        className={`font-medium ${event.type === 'income' ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {event.type === 'income' ? '+' : '-'}${event.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="rounded-lg border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Projection Results</h3>
            </div>
            {plan.summary ? (
              <>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="border rounded p-4">
                    <div className="text-sm text-muted-foreground">Retirement Year</div>
                    <div className="text-2xl font-bold">{plan.summary.retirementYear}</div>
                  </div>
                  <div className="border rounded p-4">
                    <div className="text-sm text-muted-foreground">Savings at Retirement</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${plan.summary.savingsAtRetirement.toLocaleString()}
                    </div>
                  </div>
                  <div className="border rounded p-4">
                    <div className="text-sm text-muted-foreground">Minimum Savings</div>
                    <div
                      className={`text-2xl font-bold ${plan.summary.minSavings < 0 ? 'text-red-600' : 'text-blue-600'}`}
                    >
                      ${plan.summary.minSavings.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Year {plan.summary.minSavingsYear}
                    </div>
                  </div>
                  <div className="border rounded p-4">
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div
                      className={`text-2xl font-bold ${plan.summary.isBankrupt ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {plan.summary.isBankrupt ? '❌ Risk' : '✓ Safe'}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-4">Balance Over Time</h4>
                    <RetirementProjectionChart
                      projection={calculateRetirementProjection(plan)}
                      retirementAge={plan.retirementAge}
                    />
                  </div>

                  <div>
                    <h4 className="font-medium mb-4">Yearly Breakdown</h4>
                    <RetirementYearlyTable projection={calculateRetirementProjection(plan)} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                Click "Recalculate" to generate projection results.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
