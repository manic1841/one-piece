import { useState, useEffect } from 'react';
import {
  type Transaction,
  type TransactionType,
  type Project,
  type PlannedIncome,
} from '../schemas';
import { toDateString } from '../utils/dateUtils';
import { projectService } from '../services/projectService';
import { plannedIncomeService } from '../services/plannedIncomeService';
import { type PlannedIncomeCategory } from '../schemas/plannedIncome';

export interface UseTransactionFormProps {
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

export const useTransactionForm = ({
  isOpen,
  onClose,
  onSubmit,
  onSubmitPlannedIncome,
  onUpdatePlannedIncome,
  onSuccess,
  initialData,
  initialPlannedIncome,
  householdId,
  userEmail,
}: UseTransactionFormProps) => {
  const isEditingPlannedIncome = !!initialPlannedIncome;
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(
    initialData?.amount.toString() || initialPlannedIncome?.amount.toString() || '',
  );
  const [category, setCategory] = useState(
    initialData?.category || initialPlannedIncome?.category || '',
  );
  const [projectId, setProjectId] = useState(initialData?.projectId || '');
  const [date, setDate] = useState(
    initialData?.date
      ? toDateString(initialData.date)
      : initialPlannedIncome?.date
        ? toDateString(initialPlannedIncome.date)
        : new Date().toISOString().split('T')[0],
  );
  const [description, setDescription] = useState(
    initialData?.description || initialPlannedIncome?.description || '',
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<{ projectId: string; percentage: number }[]>([]);
  const [showAllocations, setShowAllocations] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectService.getProjects(householdId);
        setProjects(data);
        // Initialize allocations with 0% for all projects if empty and not editing
        if (allocations.length === 0 && !initialPlannedIncome) {
          setAllocations(data.map((p) => ({ projectId: p.id, percentage: 0 })));
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };
    if (isOpen) {
      loadProjects();
    }
  }, [householdId, isOpen, allocations.length, initialPlannedIncome]);

  // Initialize form with initialData
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setProjectId(initialData.projectId);
      setDate(toDateString(initialData.date));
      setDescription(initialData.description || '');
      setShowAllocations(false);
    } else if (initialPlannedIncome) {
      setType('income');
      setAmount(initialPlannedIncome.amount.toString());
      setCategory(initialPlannedIncome.category);
      setDate(toDateString(initialPlannedIncome.date));
      setDescription(initialPlannedIncome.description || '');
      setShowAllocations(true);

      // Set allocations from initialPlannedIncome
      if (initialPlannedIncome.userSettings?.adjustedAllocations) {
        setAllocations(initialPlannedIncome.userSettings.adjustedAllocations);
      } else if (initialPlannedIncome.allocations) {
        setAllocations(
          initialPlannedIncome.allocations.map((a) => ({
            projectId: a.projectId,
            percentage: a.percentage,
          })),
        );
      }
    } else {
      // Reset form when not editing
      setAmount('');
      setCategory('');
      setProjectId('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setAllocations([]);
      setShowAllocations(false);
    }
  }, [initialData, initialPlannedIncome, isOpen]);

  // Load previous allocations when category changes (for income with allocations)
  useEffect(() => {
    const loadPreviousAllocations = async () => {
      if (!householdId || !category || !showAllocations || type !== 'income') return;
      if (initialPlannedIncome) return; // Don't load when editing

      try {
        const previous = await plannedIncomeService.getLatestPlannedIncomeByCategory(
          householdId,
          category as PlannedIncomeCategory,
        );
        if (previous && previous.userSettings?.adjustedAllocations) {
          const newAllocations = projects.map((p) => {
            const prevAlloc = previous.userSettings!.adjustedAllocations!.find(
              (a) => a.projectId === p.id,
            );
            return {
              projectId: p.id,
              percentage: prevAlloc ? prevAlloc.percentage : 0,
            };
          });
          setAllocations(newAllocations);
        } else if (previous && previous.allocations) {
          const newAllocations = projects.map((p) => {
            const prevAlloc = previous.allocations.find((a) => a.projectId === p.id);
            return {
              projectId: p.id,
              percentage: prevAlloc ? prevAlloc.percentage : 0,
            };
          });
          setAllocations(newAllocations);
        }
      } catch (err) {
        console.error('Failed to load previous allocations:', err);
      }
    };

    if (isOpen && projects.length > 0) {
      loadPreviousAllocations();
    }
  }, [householdId, category, isOpen, projects, showAllocations, type, initialPlannedIncome]);

  const handleAllocationChange = (projectId: string, percentage: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.projectId === projectId ? { ...a, percentage } : a)),
    );
  };

  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!category) {
      setError('Please select a category');
      return;
    }

    if (type === 'expense' && !projectId) {
      setError('Please select a project');
      return;
    }

    // Validate allocations if showing
    if (showAllocations && type === 'income') {
      if (Math.abs(totalPercentage - 100) > 0.01) {
        setError(`Total allocation must be 100%. Current: ${totalPercentage.toFixed(1)}%`);
        return;
      }
    }

    setLoading(true);

    try {
      if (showAllocations && type === 'income') {
        // Create or update PlannedIncome with allocations
        const plannedIncomeData: Omit<PlannedIncome, 'id' | 'createdAt'> = {
          amount: parseFloat(amount),
          category: category as PlannedIncomeCategory,
          date: new Date(date),
          description,
          createdBy: userEmail,
          allocations: allocations.map((a) => ({
            projectId: a.projectId,
            percentage: a.percentage,
          })),
          userSettings: {
            adjustedAllocations: allocations,
          },
        };

        if (isEditingPlannedIncome && onUpdatePlannedIncome) {
          await onUpdatePlannedIncome(plannedIncomeData);
        } else if (onSubmitPlannedIncome) {
          await onSubmitPlannedIncome(plannedIncomeData);
        }
      } else {
        // Create or update Transaction
        await onSubmit({
          amount: parseFloat(amount),
          type,
          category,
          projectId: type === 'expense' ? projectId : '',
          date: new Date(date),
          description,
          createdBy: userEmail,
        });
      }

      // Reset form
      setAmount('');
      setCategory('');
      setProjectId('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setAllocations([]);
      setShowAllocations(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return {
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
    isEditingPlannedIncome,
    handleAllocationChange,
    handleSubmit,
    totalPercentage,
  };
};
