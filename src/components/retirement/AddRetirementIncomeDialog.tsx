import { useState, useEffect, useCallback } from 'react';
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
import { Plus } from 'lucide-react';
import { plannedIncomeService } from '../../services/plannedIncomeService';
import { retirementPlanService } from '../../services/retirementPlanService';
import { useAuth } from '../../contexts/useAuth';
import { useRetirementDialogForm } from '../../hooks/useRetirementDialogForm';
import type { RetirementIncomeSource } from '../../schemas/retirementPlan';

interface AddRetirementIncomeDialogProps {
  onSave: (income: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  currentYear: number;
  initialData?: RetirementIncomeSource;
  trigger?: React.ReactNode;
}

export default function AddRetirementIncomeDialog({
  onSave,
  currentYear,
  initialData,
  trigger,
}: AddRetirementIncomeDialogProps) {
  const { userProfile } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);

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
    defaultValues: { growthRate: 3 },
  });

  // Income-specific fields
  const [type, setType] = useState<RetirementIncomeSource['type']>(initialData?.type || 'salary');
  const [selectedCategory, setSelectedCategory] = useState<string>('none');
  const [endYear, setEndYear] = useState<number>(initialData?.endYear || currentYear + 20);

  const loadCategories = useCallback(async () => {
    if (!userProfile?.householdId) return;
    try {
      const plannedIncomes = await plannedIncomeService.getPlannedIncomes(userProfile.householdId);
      const uniqueCategories = Array.from(new Set(plannedIncomes.map((pi) => pi.category)));
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Failed to load planned income categories', error);
    }
  }, [userProfile?.householdId]);

  useEffect(() => {
    if (open && userProfile?.householdId) {
      loadCategories();
    }
  }, [open, userProfile?.householdId, loadCategories]);

  // Reset income-specific fields when dialog opens
  useEffect(() => {
    if (open) {
      setType(initialData?.type || 'salary');
      setSelectedCategory('none');
      setEndYear(initialData?.endYear || currentYear + 20);
    }
  }, [open, initialData, currentYear]);

  const handleCategoryChange = async (category: string) => {
    setSelectedCategory(category);

    if (category === 'none') return;

    if (!name) setName(category);

    if (userProfile?.householdId) {
      try {
        const total = await retirementPlanService.getYearlyPlannedIncomeTotal(
          userProfile.householdId,
          currentYear,
          category,
        );
        setAmount(total);
      } catch (error) {
        console.error('Failed to fetch planned income total', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave({
        name,
        type,
        baseAmount: amount,
        growthRate,
        startYear,
        endYear,
      });
      setOpen(false);
    } catch (error) {
      console.error('Failed to save income', error);
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
            Add Income
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Income Source' : 'Add Income Source'}</DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Update the details of this income source.'
              : 'Add a new income source manually or import from planned income.'}
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
              placeholder="e.g., Salary"
              required
            />
          </div>

          {/* Row 2: Type & Import from Planned Income */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select
                value={type}
                onValueChange={(v: RetirementIncomeSource['type']) => setType(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="bonus">Bonus</SelectItem>
                  <SelectItem value="pension">Pension</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Import from Planned Income</Label>
              <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Manual)</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Annual Amount & Growth Rate */}
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
              <Label htmlFor="endYear">End Year</Label>
              <Input
                id="endYear"
                type="number"
                value={endYear}
                onChange={(e) => setEndYear(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Add Income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
