import { useState, useEffect } from 'react';
import {
  type Transaction,
  type Project,
  type PlannedIncome,
  type ProjectTransaction,
} from '../schemas';
import { TransactionType } from '@/domains/transaction/transactionType';
import { toDateString } from '../utils/dateUtils';
import { projectService } from '../services/projectService';
import { plannedIncomeService } from '../services/plannedIncomeService';
import { projectTransactionService } from '../services/projectTransactionService';
import { PlannedIncomeCategory } from '@/domains/transaction/plannedIncomeCategory';
import {
  validateTransactionForm,
  buildPlannedIncomeData,
  buildTransactionData,
} from './transactionFormHelpers';

export interface UseTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  onSubmitPlannedIncome?: (plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>) => Promise<void>;
  onUpdatePlannedIncome?: (plannedIncome: Omit<PlannedIncome, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateProjectTransaction?: (
    data: Omit<ProjectTransaction, 'id' | 'createdAt' | 'createdBy'>,
  ) => Promise<void>;
  onSuccess?: () => void;
  initialData?: Transaction;
  initialPlannedIncome?: PlannedIncome;
  initialProjectTransaction?: ProjectTransaction;
  householdId: string;
  userEmail: string;
}

export const useTransactionForm = ({
  isOpen,
  onClose,
  onSubmit,
  onSubmitPlannedIncome,
  onUpdatePlannedIncome,
  onUpdateProjectTransaction,
  onSuccess,
  initialData,
  initialPlannedIncome,
  initialProjectTransaction,
  householdId,
  userEmail,
}: UseTransactionFormProps) => {
  const isEditingPlannedIncome = !!initialPlannedIncome;
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState(
    initialData?.amount.toString() ||
      initialPlannedIncome?.amount.toString() ||
      initialProjectTransaction?.amount.toString() ||
      '',
  );
  const [category, setCategory] = useState(
    initialData?.category || initialPlannedIncome?.category || '',
  );
  const [projectId, setProjectId] = useState(initialData?.projectId || '');
  const [fromProjectId, setFromProjectId] = useState(initialProjectTransaction?.fromProject || '');
  const [toProjectId, setToProjectId] = useState(initialProjectTransaction?.toProject || '');
  const [date, setDate] = useState(
    initialData?.date
      ? toDateString(initialData.date)
      : initialPlannedIncome?.date
        ? toDateString(initialPlannedIncome.date)
        : initialProjectTransaction?.date
          ? toDateString(initialProjectTransaction.date)
          : new Date().toISOString().split('T')[0],
  );
  const [description, setDescription] = useState(
    initialData?.description ||
      initialPlannedIncome?.description ||
      initialProjectTransaction?.description ||
      '',
  );
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<{ projectId: string; percentage: number }[]>([]);
  // const [showAllocations, setShowAllocations] = useState(false);
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
    } else if (initialPlannedIncome) {
      setType('income');
      setAmount(initialPlannedIncome.amount.toString());
      setCategory(initialPlannedIncome.category);
      setDate(toDateString(initialPlannedIncome.date));
      setDescription(initialPlannedIncome.description || '');
    } else if (initialProjectTransaction) {
      setType(TransactionType.EXPENSE);
      setAmount(initialProjectTransaction.amount.toString());
      setFromProjectId(initialProjectTransaction.fromProject || '');
      setToProjectId(initialProjectTransaction.toProject);
      setDate(toDateString(initialProjectTransaction.date));
      setDescription(initialProjectTransaction.description || '');
    } else {
      // Reset form when not editing
      setAmount('');
      setCategory('');
      setProjectId('');
      setFromProjectId('');
      setToProjectId('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setAllocations([]);
    }
  }, [initialData, initialPlannedIncome, initialProjectTransaction, isOpen]);

  // Load previous allocations when category changes (for income with allocations)
  useEffect(() => {
    const loadPreviousAllocations = async () => {
      if (!householdId || !category || type !== 'income') return;
      if (initialPlannedIncome) return; // Don't load when editing

      try {
        const previous = await plannedIncomeService.getLatestPlannedIncomeByCategory(
          householdId,
          category as PlannedIncomeCategory,
        );
        if (previous && previous.allocations) {
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
  }, [householdId, category, isOpen, projects, type, initialPlannedIncome]);

  const handleAllocationChange = (projectId: string, percentage: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.projectId === projectId ? { ...a, percentage } : a)),
    );
  };

  const totalPercentage = allocations.reduce((sum, a) => sum + a.percentage, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form based on type
    if (type !== TransactionType.EXPENSE) {
      if (!amount || isNaN(parseFloat(amount))) {
        setError('請輸入有效金額');
        return;
      }
      // Only validate if both projects are selected that they're different
      if (fromProjectId && toProjectId && fromProjectId === toProjectId) {
        setError('來源專案和目標專案不能相同');
        return;
      }
    } else {
      // Validate income/expense
      const validation = validateTransactionForm(
        amount,
        category,
        type,
        true,
        projectId,
        totalPercentage,
      );

      if (!validation.isValid) {
        setError(validation.error);
        return;
      }
    }

    setLoading(true);

    try {
      if (type === TransactionType.EXPENSE) {
        // Handle transfer
        const transferData = {
          type: 'transfer' as const,
          fromProject: fromProjectId || null,
          toProject: toProjectId,
          amount: parseFloat(amount),
          date: new Date(date),
          description,
        };

        if (initialProjectTransaction && onUpdateProjectTransaction) {
          await onUpdateProjectTransaction(transferData);
        } else {
          await projectTransactionService.createProjectTransaction(householdId, {
            ...transferData,
            createdBy: userEmail,
          });
        }
      } else if (type === 'income') {
        // Handle planned income with allocations
        const plannedIncomeData = buildPlannedIncomeData(
          amount,
          category,
          date,
          description,
          userEmail,
          allocations,
        );

        if (isEditingPlannedIncome && onUpdatePlannedIncome) {
          await onUpdatePlannedIncome(plannedIncomeData);
        } else if (onSubmitPlannedIncome) {
          await onSubmitPlannedIncome(plannedIncomeData);
        }
      } else {
        // Handle regular transaction
        const transactionData = buildTransactionData(
          amount,
          type,
          category,
          projectId,
          date,
          description,
          userEmail,
          false,
        );
        await onSubmit(transactionData);
      }

      // Reset form
      setAmount('');
      setCategory('');
      setProjectId('');
      setFromProjectId('');
      setToProjectId('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setAllocations([]);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      const error = err as Error;
      setError(error.message || '儲存失敗');
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
    fromProjectId,
    setFromProjectId,
    toProjectId,
    setToProjectId,
    date,
    setDate,
    description,
    setDescription,
    projects,
    allocations,
    setAllocations,
    loading,
    error,
    isEditingPlannedIncome,
    handleAllocationChange,
    handleSubmit,
    totalPercentage,
  };
};
