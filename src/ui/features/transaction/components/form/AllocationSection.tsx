import { useState } from 'react';

import { Check, Settings2, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import { chartCategoricalColor } from '@/ui/components/charts/chartTheme';
import { FormControl, FormField, FormItem, FormMessage, NumberInput } from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Label } from '@/ui/components/ui/label';
import { type AllocationDraftItem } from '@/ui/features/transaction/types/allocation';
import { type TransactionFormProjectOption } from '@/ui/features/transaction/types/transaction';
import {
  appendShares,
  buildAllocationSlices,
  toPositiveNumber,
} from '@/ui/features/transaction/viewmodels/allocationView';
import { type TransactionAllocationFormValues } from '@/ui/features/transaction/viewmodels/transactionForm.vm';
import { cn, formatCurrency } from '@/ui/utils';

import { ToggleChipGroup } from './ChipGroup';

interface AllocationSectionProps {
  projects: TransactionFormProjectOption[];
}

const formatPercent = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

/**
 * Project attribution: one package, two modes.
 *
 * Read mode (default) answers "where does this money land?" with a name/
 * percentage row and — on wide screens — a stacked bar with the largest share on
 * the left. Edit mode reveals the multi-select chips and the percentage rows
 * under the same read view, so editing happens with the result still on screen.
 * Selecting one project writes `projectId`; a second selection upgrades the same
 * chips into a split. The item count is the source of truth — `triggerAllocation`
 * is derived by the schema, so there is no separate toggle to reconcile.
 *
 * The bar is normalized by the total, so an over-100 split keeps its true shape
 * and the percentage total carries the error instead.
 */
export const AllocationSection: React.FC<AllocationSectionProps> = ({ projects }) => {
  const [editing, setEditing] = useState(false);
  const { control, setValue, formState } = useFormContext<TransactionAllocationFormValues>();
  const { fields, replace } = useFieldArray({ control, name: 'allocationItems' });
  const watchedItems = useWatch({ control, name: 'allocationItems' }) as
    | AllocationDraftItem[]
    | undefined;
  const projectId = useWatch({ control, name: 'projectId' }) as string | undefined;
  const amount = useWatch({ control, name: 'amount' });

  const items = watchedItems ?? [];
  const selectedIds =
    items.length > 0 ? items.map((item) => item.projectId) : projectId ? [projectId] : [];

  const applySelection = (ids: string[]) => {
    if (ids.length <= 1) {
      setValue('projectId', ids[0] ?? '', { shouldValidate: true });
      replace([]);
      return;
    }

    // Percentages already edited survive; only the newly added projects get a
    // share, taken from what is left of 100.
    const added = ids.filter((id) => !items.some((item) => item.projectId === id));
    const shares =
      added.length > 0
        ? appendShares(
            items.map((item) => item.percentage),
            added.length,
          )
        : [];

    setValue('projectId', '', { shouldValidate: true });
    replace(
      ids.map((id) => ({
        projectId: id,
        percentage:
          items.find((item) => item.projectId === id)?.percentage ?? shares.shift() ?? '0',
      })),
    );
  };

  const toggle = (id: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((selected) => selected !== id)
      : [...selectedIds, id];
    applySelection(next);
  };

  const totalPercentage = items.reduce((sum, item) => sum + toPositiveNumber(item.percentage), 0);
  const amountNumber = toPositiveNumber(amount);
  const totalClass = Math.abs(totalPercentage - 100) < 0.01 ? 'text-foreground' : 'text-warning';

  const rowErrorMessages = Array.from(
    new Set(
      (Array.isArray(formState.errors.allocationItems) ? formState.errors.allocationItems : [])
        .map(
          (entry) =>
            (entry as { percentage?: { message?: string } } | undefined)?.percentage?.message,
        )
        .filter((message): message is string => typeof message === 'string'),
    ),
  );

  // An empty option list still renders when something is already selected — the
  // selection may only reference deactivated projects, which keep their rows.
  if (projects.length === 0 && selectedIds.length === 0) return null;

  // Colors follow selection order so a project keeps its color while percentages
  // change; rendering order is by share, largest first.
  const slices = buildAllocationSlices({
    selectedIds,
    items,
    projects,
    color: chartCategoricalColor,
  });

  // The bar answers "how is it composed", the total answers "is it right". Divide
  // by the total so a 120% split still shows its true shape instead of being
  // clipped by the container.
  const totalForBar = slices.reduce((sum, slice) => sum + slice.percentage, 0) || 1;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Label className="pt-1">專案</Label>
        <div className="flex items-center gap-1">
          {selectedIds.length > 0 ? (
            <Button
              type="button"
              variant="text"
              className="h-8 px-2 text-xs"
              onClick={() => applySelection([])}
              data-testid="project-clear-button"
            >
              清除
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="-mt-1 h-8 w-8 text-muted-foreground"
            aria-label={editing ? '完成專案設定' : '設定專案'}
            aria-expanded={editing}
            onClick={() => setEditing((open) => !open)}
            data-testid="project-mode-toggle"
          >
            {editing ? <Check size={15} /> : <Settings2 size={15} />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {slices.length > 0 ? (
          <>
            {/* The rows are the announced summary; the bar only repeats them. */}
            <ul aria-label="專案分配" className="space-y-1.5">
              {slices.map((slice) => (
                <li key={slice.id} className="flex items-center gap-2 text-xs">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 flex-none"
                    style={{ background: slice.color }}
                  />
                  <span className={cn('truncate', slice.inactive && 'text-muted-foreground')}>
                    {slice.name}
                  </span>
                  <span className="ml-auto font-mono tabular-nums text-foreground">
                    {formatPercent(slice.percentage)}%
                  </span>
                </li>
              ))}
            </ul>

            {/* The bar is the densest part of the widget; mobile keeps only the
                rows. */}
            <div
              aria-hidden="true"
              data-testid="allocation-bar"
              className="hidden h-2 gap-0.5 overflow-hidden rounded-sm sm:flex"
            >
              {slices.map((slice) => (
                <span
                  key={slice.id}
                  className="h-full first:rounded-l-sm last:rounded-r-sm"
                  style={{
                    width: `${(slice.percentage / totalForBar) * 100}%`,
                    background: slice.color,
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">尚未指定專案</p>
        )}
      </div>

      {/* An over-100 split keeps its shape above; the total error itself lands
          here. */}
      <FormField name="allocationItems">
        <FormItem>
          <FormMessage />
        </FormItem>
      </FormField>

      {editing ? (
        <div className="space-y-3 border-y py-3">
          <ToggleChipGroup
            aria-label="專案"
            options={projects.map((project) => ({ value: project.id, label: project.name }))}
            selectedValues={selectedIds}
            onToggle={toggle}
          />

          {items.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>分配比例</Label>
                <span className={`whitespace-nowrap text-sm font-medium ${totalClass}`}>
                  合計: {totalPercentage.toFixed(1)}%
                </span>
              </div>

              {fields.map((row, index) => {
                // An inactive project stays as a removable row; only its chip
                // is missing, since it can no longer be re-selected.
                const project = projects.find((item) => item.id === row.projectId);
                const name = project?.name ?? '已停用專案';
                const percentage = toPositiveNumber(watchedItems?.[index]?.percentage);
                const allocatedAmount = (amountNumber * percentage) / 100;

                return (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2"
                    data-testid={`allocation-row-${row.projectId}`}
                  >
                    <span className="w-full text-sm font-medium sm:w-auto sm:flex-1">{name}</span>
                    <div className="w-24 sm:w-28">
                      <div className="relative">
                        <FormField name={`allocationItems.${index}.percentage`}>
                          <FormItem className="space-y-0">
                            <FormControl>
                              <NumberInput
                                min="0"
                                max="100"
                                step="0.1"
                                aria-label={`${name} 分配比例`}
                                className="pr-6 text-right"
                              />
                            </FormControl>
                            <FormMessage className="sr-only" />
                          </FormItem>
                        </FormField>
                        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                    <div className="ml-auto w-24 text-right text-sm text-muted-foreground sm:ml-0">
                      {formatCurrency(allocatedAmount)}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        applySelection(
                          fields
                            .filter((_, rowIndex) => rowIndex !== index)
                            .map((field) => field.projectId),
                        )
                      }
                      aria-label={`移除 ${name}`}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                );
              })}

              {rowErrorMessages.map((message) => (
                <p key={message} className="text-destructive text-sm font-medium">
                  {message}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
