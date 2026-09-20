import { AlertTriangle, Calendar, Copy, Plus, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import { PageHeader } from '@/ui/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { useRetirementPlanListPage } from '@/ui/features/retirement/hooks/useRetirementPlanListPage';

export default function RetirementPlanList() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const { planItems, loading, error, mutating, createPlan, duplicatePlan } =
    useRetirementPlanListPage(userProfile?.householdId, userProfile?.email);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    const errorMessage =
      typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? 'An unknown error occurred')
        : 'An unknown error occurred';
    return <div className="p-8 text-destructive">Error: {errorMessage}</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="退休規劃"
        description="規劃未來財務並模擬不同情境。"
        actions={
          <Button onClick={createPlan} disabled={mutating}>
            <Plus className="mr-2 h-4 w-4" />
            New Plan
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {planItems.map((plan) => (
          <Card
            key={plan.id}
            className="cursor-pointer transition-shadow"
            onClick={() => navigate(`/retirement/${plan.id}`)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{plan.name}</CardTitle>
              {plan.isActive && (
                <span className="inline-flex items-center rounded bg-positive/10 px-2 py-1 text-xs font-medium text-positive ring-1 ring-inset ring-positive/20">
                  Active
                </span>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 pt-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="mr-2 h-4 w-4" />
                  Retire in {plan.retireYear}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  {plan.returnRateText}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {plan.bankruptcyText}
                </div>
                {plan.projectedSavingsText && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="text-xs text-muted-foreground">Projected Savings</div>
                    <div className="text-lg font-bold text-positive">
                      {plan.projectedSavingsText}
                    </div>
                  </div>
                )}
                <div className="pt-3" onClick={(event) => event.stopPropagation()}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => duplicatePlan(plan.id)}
                    disabled={mutating}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {planItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No plans yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first retirement plan to get started.
            </p>
            <Button onClick={createPlan} disabled={mutating}>Create Plan</Button>
          </div>
        )}
      </div>
    </div>
  );
}
