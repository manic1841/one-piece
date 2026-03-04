import React from 'react';

import { calculateRetirementProjection } from '@/domains/retirement/logic/retirementCalculator';
import { type RetirementPlan } from '@/domains/retirement/types';
import { formatCurrency } from '@/utils/formatUtils';

import RetirementProjectionChart from '../RetirementProjectionChart';
import RetirementYearlyTable from '../RetirementYearlyTable';

interface ProjectionResultsContentProps {
  plan: RetirementPlan;
}

export const ProjectionResultsContent: React.FC<ProjectionResultsContentProps> = ({ plan }) => {
  if (!plan.summary) {
    return (
      <div className="rounded-lg border p-6">
        <p className="text-muted-foreground">Click "Recalculate" to generate projection results.</p>
      </div>
    );
  }

  const projection = calculateRetirementProjection(plan);

  return (
    <div className="rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Projection Results</h3>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="border rounded p-4">
          <div className="text-sm text-muted-foreground">Retirement Year</div>
          <div className="text-2xl font-bold">{plan.summary.retirementYear}</div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-muted-foreground">Savings at Retirement</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(plan.summary.savingsAtRetirement)}
          </div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-muted-foreground">Minimum Savings</div>
          <div
            className={`text-2xl font-bold ${
              plan.summary.minSavings < 0 ? 'text-red-600' : 'text-blue-600'
            }`}
          >
            {formatCurrency(plan.summary.minSavings)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Year {plan.summary.minSavingsYear}
          </div>
        </div>
        <div className="border rounded p-4">
          <div className="text-sm text-muted-foreground">Status</div>
          <div
            className={`text-2xl font-bold ${
              plan.summary.isBankrupt ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {plan.summary.isBankrupt ? 'Risk' : 'Safe'}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-4">Balance Over Time</h4>
          <RetirementProjectionChart projection={projection} retirementAge={plan.retirementAge} />
        </div>

        <div>
          <h4 className="font-medium mb-4">Yearly Breakdown</h4>
          <RetirementYearlyTable projection={projection} />
        </div>
      </div>
    </div>
  );
};
