import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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

const categories = {
  income: [
    { value: 'salary', label: 'Salary' },
    { value: 'bonus', label: 'Bonus' },
    { value: 'other', label: 'Other' },
  ],
  expense: [
    { value: 'food', label: 'Food & Dining' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'housing', label: 'Housing' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'education', label: 'Education' },
    { value: 'shopping', label: 'Shopping' },
    { value: 'other', label: 'Other Expense' },
  ],
};

const TransactionForm: React.FC<TransactionFormProps> = ({
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
}) => {
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

  if (!isOpen) return null;

  const availableCategories = type === 'income' ? categories.income : categories.expense;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditingPlannedIncome
              ? 'Edit Planned Income'
              : initialData
                ? 'Edit Transaction'
                : showAllocations && type === 'income'
                  ? 'Record Income & Allocate'
                  : 'New Transaction'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          {/* Type Toggle */}
          {!isEditingPlannedIncome && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('expense');
                    setCategory('');
                    setShowAllocations(false);
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    type === 'expense'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setType('income');
                    setCategory('');
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    type === 'income'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Income
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select a category</option>
                {availableCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Add notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Project Selection (Expense Only) */}
          {type === 'expense' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.icon} {project.name}
                  </option>
                ))}
              </select>
              {projects.length === 0 && (
                <p className="text-xs text-red-500 mt-1">
                  No projects found. Please create a project in Settings first.
                </p>
              )}
            </div>
          )}

          {/* Allocate Button (Income Only) */}
          {type === 'income' && !isEditingPlannedIncome && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setShowAllocations(!showAllocations);
                  if (!showAllocations && allocations.length === 0) {
                    setAllocations(projects.map((p) => ({ projectId: p.id, percentage: 0 })));
                  }
                }}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  showAllocations
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showAllocations ? '✓ Allocate to Projects' : 'Allocate to Projects'}
              </button>
            </div>
          )}

          {/* Allocations Section */}
          {(showAllocations || isEditingPlannedIncome) && type === 'income' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Project Allocations
                </label>
                <span
                  className={`text-sm font-medium ${
                    Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  Total: {totalPercentage.toFixed(1)}%
                </span>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-60 overflow-y-auto">
                {projects.map((project) => {
                  const allocation = allocations.find((a) => a.projectId === project.id);
                  const percentage = allocation?.percentage || 0;
                  const allocatedAmount = amount ? (parseFloat(amount) * percentage) / 100 : 0;

                  return (
                    <div key={project.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{project.icon}</span>
                          <span className="text-sm font-medium text-gray-900">{project.name}</span>
                        </div>
                      </div>
                      <div className="w-24">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-right pr-6 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={percentage}
                            onChange={(e) =>
                              handleAllocationChange(project.id, parseFloat(e.target.value) || 0)
                            }
                          />
                          <span className="absolute right-2 top-1.5 text-gray-500 text-sm">%</span>
                        </div>
                      </div>
                      <div className="w-24 text-right text-sm text-gray-600">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(allocatedAmount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Saving...'
                : isEditingPlannedIncome
                  ? 'Update'
                  : showAllocations && type === 'income'
                    ? 'Save & Allocate'
                    : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionForm;
