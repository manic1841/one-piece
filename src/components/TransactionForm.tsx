import React from 'react';
import { X } from 'lucide-react';
import { type Transaction, type PlannedIncome } from '../schemas';
import { TRANSACTION_CATEGORIES as categories } from '../constants/categories';
import { useTransactionForm } from '../hooks/useTransactionForm';
import { TypeToggle } from './transaction-form/TypeToggle';
import { AllocationSection } from './transaction-form/AllocationSection';

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
  const { isOpen, onClose, initialData } = props; // Extract props needed for rendering logic outside the hook if any, or just pass all to hook

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
            <TypeToggle
              type={type}
              setType={setType}
              setCategory={setCategory}
              setShowAllocations={setShowAllocations}
            />
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
            <AllocationSection
              projects={projects}
              allocations={allocations}
              amount={amount}
              handleAllocationChange={handleAllocationChange}
              totalPercentage={totalPercentage}
            />
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
