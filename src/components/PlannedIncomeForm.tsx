import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { type Project } from '../schemas';
import { projectService } from '../services/projectService';
import { plannedIncomeService } from '../services/plannedIncomeService';
import { type PlannedIncomeCategory } from '../schemas/plannedIncome';

interface PlannedIncomeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  householdId: string;
  userEmail: string;
}

const categories: { value: PlannedIncomeCategory; label: string }[] = [
  { value: 'salary', label: 'Salary' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'other', label: 'Other' },
];

const PlannedIncomeForm: React.FC<PlannedIncomeFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  householdId,
  userEmail,
}) => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<PlannedIncomeCategory>('salary');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<{ projectId: string; percentage: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectService.getProjects(householdId);
        setProjects(data);
        // Initialize allocations with 0% for all projects if empty
        if (allocations.length === 0) {
          setAllocations(data.map((p) => ({ projectId: p.id, percentage: 0 })));
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };
    if (isOpen) {
      loadProjects();
    }
  }, [householdId, isOpen, allocations.length]);

  // Load previous allocations when category changes
  useEffect(() => {
    const loadPreviousAllocations = async () => {
      if (!householdId || !category) return;
      try {
        const previous = await plannedIncomeService.getLatestPlannedIncomeByCategory(
          householdId,
          category,
        );
        if (previous && previous.userSettings?.adjustedAllocations) {
          // Map previous allocations to current projects
          // We need to handle projects that might have been deleted or added
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
          // Fallback to actual allocations if userSettings not available
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
  }, [householdId, category, isOpen, projects]); // Depend on projects.length to ensure projects are loaded

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

    if (Math.abs(totalPercentage - 100) > 0.01) {
      setError(`Total allocation must be 100%. Current: ${totalPercentage.toFixed(1)}%`);
      return;
    }

    setLoading(true);

    try {
      await plannedIncomeService.createPlannedIncome(householdId, {
        amount: parseFloat(amount),
        category,
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
      });

      // Reset form
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      onSuccess();
      onClose();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to save planned income');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">Record Income & Allocate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

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
                onChange={(e) => setCategory(e.target.value as PlannedIncomeCategory)}
              >
                {categories.map((cat) => (
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

          {/* Allocations */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Project Allocations</label>
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
              {loading ? 'Saving...' : 'Save & Allocate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlannedIncomeForm;
