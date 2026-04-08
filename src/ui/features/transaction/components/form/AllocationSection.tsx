import { useMemo, useState } from 'react';

import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { type AllocationDraftItem } from '@/ui/features/transaction/types/allocation';
import { type TransactionFormProjectOption } from '@/ui/features/transaction/types/transaction';
import { formatCurrency } from '@/ui/utils';

interface AllocationSectionProps {
  projects: TransactionFormProjectOption[];
  allocations: AllocationDraftItem[];
  amount: string;
  title: string;
  tone?: 'income' | 'expense';
  onAllocationsChange: (allocations: AllocationDraftItem[]) => void;
}

const parsePercentage = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const parseAmount = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const AllocationSection: React.FC<AllocationSectionProps> = ({
  projects,
  allocations,
  amount,
  title,
  tone = 'income',
  onAllocationsChange,
}) => {
  const availableProjects = useMemo(
    () => projects.filter((project) => !allocations.some((item) => item.projectId === project.id)),
    [allocations, projects],
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const totalPercentage = allocations.reduce(
    (sum, item) => sum + parsePercentage(item.percentage),
    0,
  );
  const amountNumber = parseAmount(amount);

  const totalClass =
    Math.abs(totalPercentage - 100) < 0.01
      ? tone === 'income'
        ? 'text-emerald-700'
        : 'text-rose-700'
      : 'text-amber-700';

  const addSelectedProject = () => {
    if (!selectedProjectId) return;
    onAllocationsChange([...allocations, { projectId: selectedProjectId, percentage: '' }]);
    setSelectedProjectId('');
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label>{title}</Label>
        <span className={`text-sm font-medium ${totalClass}`}>
          合計: {totalPercentage.toFixed(1)}%
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedProjectId}
          onChange={(event) => setSelectedProjectId(event.target.value)}
          className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="選擇要分配的專案"
          data-testid="allocation-project-select"
        >
          <option value="">選擇專案加入分配</option>
          {availableProjects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.icon ? `${project.icon} ` : ''}
              {project.name}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="outline"
          onClick={addSelectedProject}
          disabled={!selectedProjectId}
          data-testid="allocation-add-button"
        >
          加入專案
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => onAllocationsChange([])}
          disabled={allocations.length === 0}
          data-testid="allocation-clear-button"
        >
          清空分配
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3 max-h-60 overflow-y-auto">
          {allocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚未加入分配專案。</p>
          ) : null}

          {allocations.map((allocation) => {
            const project = projects.find((item) => item.id === allocation.projectId);
            if (!project) return null;

            const percentage = parsePercentage(allocation.percentage);
            const allocatedAmount = (amountNumber * percentage) / 100;

            return (
              <div
                key={project.id}
                className="flex items-center gap-3"
                data-testid={`allocation-row-${project.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{project.icon}</span>
                    <span className="text-sm font-medium">{project.name}</span>
                  </div>
                </div>
                <div className="w-24">
                  <div className="relative">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className="text-right pr-6"
                      value={allocation.percentage}
                      onChange={(e) => {
                        const next = allocations.map((item) =>
                          item.projectId === project.id
                            ? { ...item, percentage: e.target.value }
                            : item,
                        );
                        onAllocationsChange(next);
                      }}
                    />
                    <span className="absolute right-3 top-2.5 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                </div>
                <div className="w-24 text-right text-sm text-muted-foreground">
                  {formatCurrency(allocatedAmount)}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() =>
                    onAllocationsChange(allocations.filter((item) => item.projectId !== project.id))
                  }
                >
                  移除
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};
