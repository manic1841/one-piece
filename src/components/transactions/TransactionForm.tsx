import React from 'react';
import { type Transaction, type PlannedIncome } from '../../schemas';
import { TRANSACTION_CATEGORIES as categories } from '../../constants/categories';
import { useTransactionForm } from '../../hooks/useTransactionForm';
import { TypeToggle } from '../transaction-form/TypeToggle';
import { AllocationSection } from '../transaction-form/AllocationSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  onSubmitPlannedIncome?: (plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>) => Promise<void>;
  onUpdatePlannedIncome?: (plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>) => Promise<void>;
  onSuccess?: () => void;
  initialData?: Transaction;
  initialPlannedIncome?: PlannedIncome;
  householdId: string;
  userEmail: string;
}

const TransactionForm: React.FC<TransactionFormProps> = (props) => {
  const { isOpen, onClose } = props;

  // Use the hook
  const {
    type,
    setType,
    amount,
    setAmount,
    category,
    setCategory,
    projectId,
    setProjectId,
    date,
    setDate,
    description,
    setDescription,
    projects,
    allocations,
    setAllocations,
    showAllocations,
    setShowAllocations,
    loading,
    error,
    handleAllocationChange,
    handleSubmit,
    totalPercentage,
    isEditingPlannedIncome,
  } = useTransactionForm(props);

  const availableCategories = type === 'income' ? categories.income : categories.expense;

  const getDialogTitle = () => {
    if (isEditingPlannedIncome) return 'Edit Planned Income';
    if (props.initialData) return 'Edit Transaction';
    if (showAllocations && type === 'income') return 'Record Income & Allocate';
    return 'New Transaction';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Type Toggle */}
          {!isEditingPlannedIncome && (
            <TypeToggle
              type={type}
              setType={setType}
              setCategory={setCategory}
              setShowAllocations={setShowAllocations}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                required
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory} required>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                type="text"
                placeholder="Add notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Project Selection (Expense or Income without Allocations) */}
          {(type === 'expense' || (type === 'income' && !showAllocations)) && (
            <div className="space-y-2">
              <Label htmlFor="project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId} required>
                <SelectTrigger id="project">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.icon} {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projects.length === 0 && (
                <p className="text-xs text-destructive">
                  No projects found. Please create a project in Settings first.
                </p>
              )}
            </div>
          )}

          {/* Allocate Button (Income Only) */}
          {type === 'income' && !isEditingPlannedIncome && (
            <div>
              <Button
                type="button"
                variant={showAllocations ? 'default' : 'outline'}
                onClick={() => {
                  setShowAllocations(!showAllocations);
                  if (!showAllocations && allocations.length === 0) {
                    setAllocations(projects.map((p) => ({ projectId: p.id, percentage: 0 })));
                  }
                }}
                className={`w-full ${showAllocations ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200' : ''}`}
              >
                {showAllocations ? '✓ Allocate to Projects' : 'Allocate to Projects'}
              </Button>
            </div>
          )}

          {/* Allocations Section */}
          {(showAllocations || isEditingPlannedIncome) && type === 'income' && (
            <AllocationSection
              projects={projects}
              allocations={allocations}
              amount={amount}
              handleAllocationChange={handleAllocationChange}
              totalPercentage={totalPercentage}
            />
          )}
        </form>

        {/* Actions */}
        <DialogFooter className="border-t pt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading
              ? 'Saving...'
              : isEditingPlannedIncome
                ? 'Update'
                : showAllocations && type === 'income'
                  ? 'Save & Allocate'
                  : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionForm;
