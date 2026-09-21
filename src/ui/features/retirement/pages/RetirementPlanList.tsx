import { Copy, Plus, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/infra/contexts/useAuth';
import { PageHeader } from '@/ui/components/PageHeader';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
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

      {planItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <TrendingUp className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">No plans yet</h3>
            <p className="mb-4 text-muted-foreground">
              Create your first retirement plan to get started.
            </p>
            <Button onClick={createPlan} disabled={mutating}>
              Create Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <Table className="bg-card">
            <TableHeader className="hidden md:table-header-group">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Retirement Age</TableHead>
                <TableHead className="text-right">Final Net Worth</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planItems.map((plan) => (
                <TableRow
                  key={plan.id}
                  data-testid={`retirement-plan-row-${plan.id}`}
                  onClick={() => navigate(`/retirement/${plan.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground md:hidden">
                      Retirement Age
                    </span>
                    {plan.retirementAge}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-positive">
                    <span className="block text-[10px] uppercase tracking-widest text-muted-foreground md:hidden">
                      Final Net Worth
                    </span>
                    {plan.finalNetWorthText}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        plan.isActive ? 'text-positive' : 'text-muted-foreground'
                      }
                    >
                      {plan.statusText}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Duplicate plan"
                      title="Duplicate plan"
                      onClick={(event) => {
                        event.stopPropagation();
                        void duplicatePlan(plan.id);
                      }}
                      disabled={mutating}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
