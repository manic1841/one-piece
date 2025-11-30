import { type PlannedIncome, type Transaction } from '../schemas';
import { type PlannedIncomeCategory } from '../schemas/plannedIncome';

interface ValidationResult {
  isValid: boolean;
  error: string;
}

export const validateTransactionForm = (
  amount: string,
  category: string,
  type: 'income' | 'expense',
  showAllocations: boolean,
  projectId: string,
  totalPercentage: number,
): ValidationResult => {
  if (!amount || parseFloat(amount) <= 0) {
    return { isValid: false, error: 'Please enter a valid amount' };
  }

  if (!category) {
    return { isValid: false, error: 'Please select a category' };
  }

  if ((type === 'expense' || (type === 'income' && !showAllocations)) && !projectId) {
    return { isValid: false, error: 'Please select a project' };
  }

  if (showAllocations && type === 'income') {
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return {
        isValid: false,
        error: `Total allocation must be 100%. Current: ${totalPercentage.toFixed(1)}%`,
      };
    }
  }

  return { isValid: true, error: '' };
};

export const buildPlannedIncomeData = (
  amount: string,
  category: string,
  date: string,
  description: string,
  userEmail: string,
  allocations: { projectId: string; percentage: number }[],
): Omit<PlannedIncome, 'id' | 'createdAt'> => {
  return {
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
};

export const buildTransactionData = (
  amount: string,
  type: 'income' | 'expense',
  category: string,
  projectId: string,
  date: string,
  description: string,
  userEmail: string,
  showAllocations: boolean,
): Omit<Transaction, 'id' | 'createdAt'> => {
  return {
    amount: parseFloat(amount),
    type,
    category,
    projectId: type === 'expense' || (type === 'income' && !showAllocations) ? projectId : '',
    date: new Date(date),
    description,
    createdBy: userEmail,
  };
};
