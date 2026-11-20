import { useState } from 'react';

import { useFormField } from '@/ui/components/form';
import { type TransactionFormCategoryOption } from '@/ui/features/transaction/types/transaction';

import { ChipGroup } from './ChipGroup';
import { MORE_EXPENSE_INTENTS, QUICK_EXPENSE_INTENTS } from './expenseCategoryGroups';

type ExpenseCategoryPickerProps = {
  categories: TransactionFormCategoryOption[];
  /** Optional override so the caller can clear dependent fields on pick. */
  onChange?: (intent: string) => void;
};

/**
 * Expense category picker: a curated quick row plus a lightweight "更多" toggle
 * that reveals the rest in place. The currently selected intent is always pinned
 * into the visible row, so a choice from the hidden set is never invisible.
 */
export function ExpenseCategoryPicker({ categories, onChange }: ExpenseCategoryPickerProps) {
  const { field } = useFormField();
  const [expanded, setExpanded] = useState(false);
  const select = onChange ?? field.onChange;

  const value = (field.value as string | undefined) ?? '';
  const byIntent = new Map(categories.map((category) => [category.value, category]));
  const pick = (intent: string) => byIntent.get(intent);
  const isOption = (
    option: TransactionFormCategoryOption | undefined,
  ): option is TransactionFormCategoryOption => Boolean(option);

  const quick = QUICK_EXPENSE_INTENTS.map(pick).filter(isOption);
  const more = MORE_EXPENSE_INTENTS.map(pick).filter(isOption);
  const selectedHidden = more.find((option) => option.value === value);
  const visible = selectedHidden ? [...quick, selectedHidden] : quick;
  const hidden = more.filter((option) => option.value !== value);

  return (
    <div className="space-y-2">
      <ChipGroup aria-label="類別" options={visible} value={value} onChange={select} />
      {hidden.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground text-xs font-medium transition-transform duration-fast ease-out-quint active:scale-[0.97]"
            aria-expanded={expanded}
            onClick={() => setExpanded((previous) => !previous)}
            data-testid="expense-more-toggle"
          >
            {expanded ? '收起' : '+ 更多'}
          </button>
          {expanded ? <ChipGroup options={hidden} value={value} onChange={select} /> : null}
        </div>
      ) : null}
    </div>
  );
}
