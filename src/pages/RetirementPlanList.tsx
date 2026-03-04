import { Calendar, Plus, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/useAuth';
import { useRetirementPlanListPage } from '../hooks/pages/useRetirementPlanListPage';
import { formatCurrency } from '../utils/formatUtils';

export default function RetirementPlanList() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { plans, loading, error, createPlan } = useRetirementPlanListPage(
    userProfile?.householdId,
    userProfile?.email,
  );

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    const errorMessage = (error as any)?.message || 'An unknown error occurred';
    return <div className="p-8 text-destructive">Error: {errorMessage}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retirement Planning</h1>
          <p className="text-muted-foreground mt-2">
            Plan your financial future and simulate different scenarios.
          </p>
        </div>
        <Button onClick={createPlan}>
          <Plus className="mr-2 h-4 w-4" />
          New Plan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/retirement/${plan.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{plan.name}</CardTitle>
              {plan.isActive && (
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  Active
                </span>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 pt-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Retire at {plan.retirementAge}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {plan.investmentReturnRate}% Return
                </div>
                {plan.summary && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-xs text-muted-foreground">Projected Savings</div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(plan.summary.savingsAtRetirement)}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {plans.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No plans yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first retirement plan to get started.
            </p>
            <Button onClick={createPlan}>Create Plan</Button>
          </div>
        )}
      </div>
    </div>
  );
}
