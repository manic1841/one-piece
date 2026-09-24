import { useMemo, useState } from 'react';

import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormMessage, NumberInput } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';
import { Label } from '@/ui/components/ui/label';
import { type AllocationDraftItem } from '@/ui/features/transaction/types/allocation';
import { type TransactionFormProjectOption } from '@/ui/features/transaction/types/transaction';
import { type TransactionAllocationFormValues } from '@/ui/features/transaction/viewmodels/transactionForm.vm';
import { formatCurrency } from '@/ui/utils';

interface AllocationSectionProps {
  projects: TransactionFormProjectOption[];
  title: string;
  tone?: 'income' | 'expense';
}

const toPositiveNumber = (value: string | number | undefined) => {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * The allocation repeater. The array itself lives in RHF (`useFieldArray`); each
 * row binds its percentage by indexed path through the shared glue, and the row
 * key is the field-array `id`.
 */
export const AllocationSection: React.FC<AllocationSectionProps> = ({
  projects,
  title,
  tone = 'income',
}) => {
  const { control } = useFormContext<TransactionAllocationFormValues>();
  const { fields, append, remove, replace } = useFieldArray({ control, name: 'allocationItems' });
  const watchedItems = useWatch({ control, name: 'allocationItems' }) as
    | AllocationDraftItem[]
    | undefined;
  const amount = useWatch({ control, name: 'amount' });

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const projectIds = useMemo(() => new Set(fields.map((item) => item.projectId)), [fields]);
  const availableProjects = useMemo(
    () => projects.filter((project) => !projectIds.has(project.id)),
    [projectIds, projects],
  );

  const totalPercentage = (watchedItems ?? []).reduce(
    (sum, item) => sum + toPositiveNumber(item.percentage),
    0,
  );
  const amountNumber = toPositiveNumber(amount);

  const totalClass =
    Math.abs(totalPercentage - 100) < 0.01
      ? tone === 'income'
        ? 'text-positive'
        : 'text-negative'
      : 'text-warning';

  const addSelectedProject = () => {
    if (!selectedProjectId) return;
    append({ projectId: selectedProjectId, percentage: '' });
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
          onClick={() => replace([])}
          disabled={fields.length === 0}
          data-testid="allocation-clear-button"
        >
          清空分配
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3 max-h-60 overflow-y-auto">
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">尚未加入分配專案。</p>
          ) : null}

          {fields.map((row, index) => {
            const project = projects.find((item) => item.id === row.projectId);
            if (!project) return null;

            const percentage = toPositiveNumber(watchedItems?.[index]?.percentage);
            const allocatedAmount = (amountNumber * percentage) / 100;

            return (
              <div
                key={row.id}
                className="flex items-center gap-3"
                data-testid={`allocation-row-${project.id}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{project.name}</span>
                  </div>
                </div>
                <div className="w-24">
                  <div className="relative">
                    <FormField name={`allocationItems.${index}.percentage`}>
                      <FormItem className="space-y-0">
                        <FormControl>
                          <NumberInput min="0" max="100" step="0.1" className="pr-6 text-right" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    </FormField>
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
                  onClick={() => remove(index)}
                >
                  移除
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <FormField name="allocationItems">
        <FormItem>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  );
};
