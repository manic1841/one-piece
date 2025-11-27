import React from 'react';
import { type Project } from '../../schemas';

interface AllocationSectionProps {
  projects: Project[];
  allocations: { projectId: string; percentage: number }[];
  amount: string;
  handleAllocationChange: (projectId: string, percentage: number) => void;
  totalPercentage: number;
}

export const AllocationSection: React.FC<AllocationSectionProps> = ({
  projects,
  allocations,
  amount,
  handleAllocationChange,
  totalPercentage,
}) => {
  return (
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
  );
};
