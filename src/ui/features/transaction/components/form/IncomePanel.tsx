import { Checkbox } from '@/ui/components/ui/checkbox';
import { Label } from '@/ui/components/ui/label';
import { Textarea } from '@/ui/components/ui/textarea';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import {
  type IncomeFormState,
  type TransactionFormCategoryOption,
  type TransactionFormProjectOption,
} from '@/ui/features/transaction/types/transaction';

import { AllocationSection } from './AllocationSection';
import { AmountDateFields } from './AmountDateFields';
import { ChipGroup } from './ChipGroup';
import { DynamicCategorySelector } from './DynamicCategorySelector';

type IncomePanelProps = {
  state: IncomeFormState;
  categories: TransactionFormCategoryOption[];
  projects: TransactionFormProjectOption[];
  allLedgerCodes: LedgerCodeItem[];
  onChange: (next: IncomeFormState) => void;
};

export function IncomePanel({
  state,
  categories,
  projects,
  allLedgerCodes,
  onChange,
}: IncomePanelProps) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <AmountDateFields
        amountId="income-amount"
        dateId="income-date"
        amount={state.amount}
        date={state.date}
        onAmountChange={(amount) => onChange({ ...state, amount })}
        onDateChange={(date) => onChange({ ...state, date })}
      />
      <div className="space-y-2">
        <Label>收入類別</Label>
        <ChipGroup
          options={categories}
          value={state.intent}
          onChange={(intent) => onChange({ ...state, intent })}
          tone="income"
        />
      </div>

      <DynamicCategorySelector
        intent={state.intent}
        ledgerCode={state.ledgerCode}
        allLedgerCodes={allLedgerCodes}
        onChange={(ledgerCode) => onChange({ ...state, ledgerCode })}
      />

      <div className="space-y-2">
        <Label htmlFor="income-description">說明</Label>
        <Textarea
          id="income-description"
          value={state.description}
          onChange={(event) => onChange({ ...state, description: event.target.value })}
          placeholder="例如：薪資、獎金、退款回補"
        />
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <Checkbox
          checked={state.triggerAllocation}
          onCheckedChange={(checked) =>
            onChange({
              ...state,
              triggerAllocation: checked === true,
              allocationItems: checked === true ? state.allocationItems : [],
            })
          }
          className="mt-0.5 border-emerald-500"
        />
        <span>收入分配</span>
      </label>

      {state.triggerAllocation ? (
        <AllocationSection
          projects={projects}
          allocations={state.allocationItems}
          amount={state.amount}
          title="收入分配"
          tone="income"
          onAllocationsChange={(allocationItems) => onChange({ ...state, allocationItems })}
        />
      ) : null}
    </div>
  );
}
