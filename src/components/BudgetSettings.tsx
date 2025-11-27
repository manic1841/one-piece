import React, { useState, useEffect } from 'react';
import { type BudgetAllocations, type IncomeCategory, type Project } from '../schemas';
import { budgetService } from '../services/budgetService';
import { projectService } from '../services/projectService';

interface BudgetSettingsProps {
  householdId: string;
}

const incomeLabels: Record<IncomeCategory, string> = {
  salary: 'Salary (薪資)',
  bonus: 'Bonus (獎金)',
  investment: 'Investment (投資)',
  other: 'Other Income (其他收入)',
};

const BudgetSettings: React.FC<BudgetSettingsProps> = ({ householdId }) => {
  const [selectedIncome, setSelectedIncome] = useState<IncomeCategory>('salary');
  const [allocations, setAllocations] = useState<BudgetAllocations | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allocationsData, projectsData] = await Promise.all([
          budgetService.getBudgetAllocations(householdId),
          projectService.getProjects(householdId),
        ]);
        setAllocations(allocationsData);
        setProjects(projectsData);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Failed to load budget settings');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [householdId]);

  const handleChange = (projectId: string, value: number) => {
    if (!allocations) return;

    setAllocations((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [selectedIncome]: {
          ...prev[selectedIncome],
          [projectId]: value,
        },
      };
    });
    setSuccess(false);
    setError('');
  };

  const getTotalPercentage = (incomeType: IncomeCategory) => {
    if (!allocations) return 0;
    const allocation = allocations[incomeType];
    // Only sum up allocations for current projects to avoid ghost keys affecting the total
    return projects.reduce((sum, project) => sum + (allocation[project.id] || 0), 0);
  };

  const handleSave = async () => {
    if (!allocations) return;

    // Validate all income types
    for (const incomeType of Object.keys(allocations) as IncomeCategory[]) {
      const total = getTotalPercentage(incomeType);
      if (Math.abs(total - 100) > 0.01) {
        setError(
          `Total for ${incomeLabels[incomeType]} must equal 100% (currently ${total.toFixed(1)}%)`,
        );
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      await budgetService.updateBudgetAllocations(householdId, allocations);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to save budget allocations');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading budget settings...</div>;
  }

  if (!allocations) {
    return <div className="text-red-500">Error loading allocations</div>;
  }

  const currentAllocation = allocations[selectedIncome];
  const total = getTotalPercentage(selectedIncome);
  const isValid = Math.abs(total - 100) < 0.01;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Budget Allocation</h3>
        <p className="text-sm text-gray-600">
          Set different budget allocations for each income source. Unallocated amounts go to
          savings.
        </p>
      </div>

      {/* Income Source Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(Object.keys(allocations) as IncomeCategory[]).map((incomeType) => {
          const incomeTotal = getTotalPercentage(incomeType);
          const incomeValid = Math.abs(incomeTotal - 100) < 0.01;

          return (
            <button
              key={incomeType}
              onClick={() => setSelectedIncome(incomeType)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedIncome === incomeType
                  ? 'bg-blue-600 text-white'
                  : incomeValid
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {incomeLabels[incomeType]}
              {!incomeValid && ' ⚠️'}
            </button>
          );
        })}
      </div>

      {/* Allocation Sliders */}
      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No projects found. Please add projects first.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-10 h-10 flex items-center justify-center rounded-lg ${project.color || 'bg-gray-100 text-gray-600'}`}
                  >
                    {project.icon || '📁'}
                  </span>
                  <span className="font-medium text-gray-900">{project.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={currentAllocation[project.id] || 0}
                    onChange={(e) => handleChange(project.id, parseFloat(e.target.value) || 0)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <span className="text-gray-600 w-6">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={currentAllocation[project.id] || 0}
                onChange={(e) => handleChange(project.id, parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          ))
        )}
      </div>

      {/* Total Display */}
      <div
        className={`p-4 rounded-lg ${isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
      >
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">
            Total for {incomeLabels[selectedIncome]}
          </span>
          <span className={`text-lg font-bold ${isValid ? 'text-green-700' : 'text-red-700'}`}>
            {total.toFixed(1)}%
          </span>
        </div>
        {!isValid && <p className="text-sm text-red-600 mt-1">Total must equal 100%</p>}
      </div>

      {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

      {success && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">
          Budget allocations saved successfully!
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || projects.length === 0}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : 'Save All Budget Allocations'}
      </button>
    </div>
  );
};

export default BudgetSettings;
