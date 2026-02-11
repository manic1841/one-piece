import { Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../contexts/useAuth';
import type { Project } from '../../schemas';
import type { RetirementExpenseCategory } from '../../schemas/retirementPlan';
import { projectService } from '../../services/projectService';
import { retirementPlanService } from '../../services/retirementPlanService';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

import { useRetirementDialogForm } from './useRetirementDialogForm';

interface AddRetirementExpenseDialogProps {
  onSave: (expense: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  currentYear: number;
  initialData?: RetirementExpenseCategory;
  trigger?: React.ReactNode;
}

export default function AddRetirementExpenseDialog({
  onSave,
  currentYear,
  initialData,
  trigger,
}: AddRetirementExpenseDialogProps) {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  // Use shared hook for common fields
  const {
    open,
    setOpen,
    loading,
    setLoading,
    name,
    setName,
    amount,
    setAmount,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,
  } = useRetirementDialogForm({
    initialData,
    currentYear,
    defaultValues: { growthRate: 2 },
  });

  // Expense-specific fields
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialData?.sourceProjectId || 'none',
  );
  const [endYear, setEndYear] = useState<string>(
    initialData?.endYear ? initialData.endYear.toString() : '',
  );
  const [percentOfSalary, setPercentOfSalary] = useState<number>(initialData?.percentOfSalary || 0);
  const [retirementMultiplier, setRetirementMultiplier] = useState<number>(
    initialData ? initialData.retirementMultiplier * 100 : 70,
  );

  const loadProjects = useCallback(async () => {
    if (!userProfile?.householdId) return;
    try {
      const allProjects = await projectService.getProjects(userProfile.householdId);
      setProjects(allProjects.filter((p) => p.isActive));
    } catch (error) {
      console.error('Failed to load projects', error);
    }
  }, [userProfile?.householdId]);

  useEffect(() => {
    if (open && userProfile?.householdId) {
      loadProjects();
    }
  }, [open, userProfile?.householdId, loadProjects]);

  // Reset expense-specific fields when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedProjectId(initialData?.sourceProjectId || 'none');
      setEndYear(initialData?.endYear ? initialData.endYear.toString() : '');
      setPercentOfSalary(initialData?.percentOfSalary || 0);
      setRetirementMultiplier(initialData ? initialData.retirementMultiplier * 100 : 70);
    }
  }, [open, initialData]);

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);

    if (projectId === 'none') return;

    const project = projects.find((p) => p.id === projectId);
    if (project) {
      if (!name) setName(project.name);

      if (userProfile?.householdId) {
        try {
          const yearlyExpense = await retirementPlanService.getProjectYearlyExpense(
            userProfile.householdId,
            projectId,
            currentYear,
          );
          setAmount(yearlyExpense);
        } catch (error) {
          console.error('Failed to fetch project expense', error);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        name,
        sourceProjectId: selectedProjectId === 'none' ? undefined : selectedProjectId,
        baseAmount: amount,
        growthRate,
        percentOfSalary: percentOfSalary > 0 ? percentOfSalary : undefined,
        retirementMultiplier: retirementMultiplier / 100,
        startYear,
        endYear: endYear ? parseInt(endYear) : null,
      });
      setOpen(false);
    } catch (error) {
      console.error('Failed to save expense', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Expense Category' : 'Add Expense Category'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update the details of this expense category.'
              : 'Add a new expense category manually or import from an existing project.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          {/* Row 1: Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries"
              required
            />
          </div>

          {/* Row 2: Annual Amount & Import from Project */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Annual Amount</Label>
              <Input
                id="amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project">Import from Project</Label>
              <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Manual)</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Growth Rate & Percent of Salary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="growth">Growth Rate (%)</Label>
              <Input
                id="growth"
                type="number"
                step="0.1"
                value={growthRate}
                onChange={(e) => setGrowthRate(Number(e.target.value))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="percentOfSalary">Percent of Salary (%)</Label>
              <Input
                id="percentOfSalary"
                type="number"
                step="0.1"
                value={percentOfSalary}
                onChange={(e) => setPercentOfSalary(Number(e.target.value))}
                placeholder="Optional"
              />
            </div>
          </div>

          {/* Row 4: Start Year & End Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startYear">Start Year</Label>
              <Input
                id="startYear"
                type="number"
                value={startYear}
                onChange={(e) => setStartYear(Number(e.target.value))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endYear">End Year (Optional)</Label>
              <Input
                id="endYear"
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(e.target.value)}
                placeholder="Lifetime"
              />
            </div>
          </div>

          {/* Row 5: Retirement Multiplier */}
          <div className="grid gap-2">
            <Label htmlFor="multiplier">Retirement Multiplier (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="multiplier"
                type="number"
                value={retirementMultiplier}
                onChange={(e) => setRetirementMultiplier(Number(e.target.value))}
                required
              />
              <span className="text-sm text-muted-foreground">
                % of expense continuing after retirement
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
