import { Checkbox } from '@/ui/components/ui/checkbox';
import { Label } from '@/ui/components/ui/label';
import { Textarea } from '@/ui/components/ui/textarea';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import {
  type ExpenseFormState,
  type TransactionFormCategoryOption,
  type TransactionFormProjectOption,
} from '@/ui/features/transaction/types/transaction';

import { AllocationSection } from './AllocationSection';
import { AmountDateFields } from './AmountDateFields';
import { ChipGroup } from './ChipGroup';
import { DynamicCategorySelector } from './DynamicCategorySelector';

type ExpensePanelProps = {
  state: ExpenseFormState;
  projects: TransactionFormProjectOption[];
  categories: TransactionFormCategoryOption[];
  allLedgerCodes: LedgerCodeItem[];
  onChange: (next: ExpenseFormState) => void;
};

const toProjectOptions = (projects: TransactionFormProjectOption[]) =>
  projects.map((project) => ({
    value: project.id,
    label: `${project.icon ? `${project.icon} ` : ''}${project.name}`,
  }));

export function ExpensePanel({
  state,
  projects,
  categories,
  allLedgerCodes,
  onChange,
}: ExpensePanelProps) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <AmountDateFields
        amountId="expense-amount"
        dateId="expense-date"
        amount={state.amount}
        date={state.date}
        onAmountChange={(amount) => onChange({ ...state, amount })}
        onDateChange={(date) => onChange({ ...state, date })}
      />
      <div className="space-y-2">
        <Label>專案</Label>
        <ChipGroup
          options={toProjectOptions(projects)}
          value={state.projectId}
          onChange={(projectId) => onChange({ ...state, projectId })}
          tone="neutral"
        />
      </div>
      <div className="space-y-2">
        <Label>費用類別</Label>
        <ChipGroup
          options={categories}
          value={state.intent}
          onChange={(intent) => onChange({ ...state, intent })}
          tone="expense"
        />
      </div>

      <DynamicCategorySelector
        intent={state.intent}
        ledgerCode={state.ledgerCode}
        allLedgerCodes={allLedgerCodes}
        onChange={(ledgerCode) => onChange({ ...state, ledgerCode })}
      />

      <div className="space-y-2">
        <Label htmlFor="expense-description">說明</Label>
        <Textarea
          id="expense-description"
          value={state.description}
          onChange={(event) => onChange({ ...state, description: event.target.value })}
          placeholder="補充這筆支出的脈絡"
        />
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        <Checkbox
          checked={state.triggerAllocation}
          onCheckedChange={(checked) =>
            onChange({
              ...state,
              triggerAllocation: checked === true,
              allocationItems: checked === true ? state.allocationItems : [],
            })
          }
          className="mt-0.5 border-rose-500"
        />
        <span>支出分配</span>
      </label>

      {state.triggerAllocation ? (
        <AllocationSection
          projects={projects}
          allocations={state.allocationItems}
          amount={state.amount}
          title="支出分攤"
          tone="expense"
          onAllocationsChange={(allocationItems) => onChange({ ...state, allocationItems })}
        />
      ) : null}
    </div>
  );
}
