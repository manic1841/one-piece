import { Label } from '@/ui/components/ui/label';
import { Textarea } from '@/ui/components/ui/textarea';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import {
  type FinancingFormState,
  type InvestmentFormState,
  type TransactionFormCategoryOption,
  type TransactionFormProjectOption,
} from '@/ui/features/transaction/types/transaction';

import { AmountDateFields } from './AmountDateFields';
import { ChipGroup } from './ChipGroup';
import { DynamicCategorySelector } from './DynamicCategorySelector';

type CategoryPanelProps = {
  title: string;
  tone: 'expense' | 'income' | 'neutral';
  state: InvestmentFormState | FinancingFormState;
  categories: TransactionFormCategoryOption[];
  projects: TransactionFormProjectOption[];
  allLedgerCodes: LedgerCodeItem[];
  onChange: (next: InvestmentFormState | FinancingFormState) => void;
};

const toProjectOptions = (projects: TransactionFormProjectOption[]) =>
  projects.map((project) => ({
    value: project.id,
    label: `${project.icon ? `${project.icon} ` : ''}${project.name}`,
  }));

export function CategoryPanel({
  title,
  tone,
  state,
  categories,
  projects,
  allLedgerCodes,
  onChange,
}: CategoryPanelProps) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <AmountDateFields
        amountId={`${title}-amount`}
        dateId={`${title}-date`}
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
        <Label>類別</Label>
        <ChipGroup
          options={categories}
          value={state.intent}
          onChange={(intent) => onChange({ ...state, intent })}
          tone={tone}
        />
      </div>

      <DynamicCategorySelector
        intent={state.intent}
        ledgerCode={state.ledgerCode}
        allLedgerCodes={allLedgerCodes}
        onChange={(ledgerCode) => onChange({ ...state, ledgerCode })}
      />

      <div className="space-y-2">
        <Label htmlFor={`${title}-description`}>說明</Label>
        <Textarea
          id={`${title}-description`}
          value={state.description}
          onChange={(event) => onChange({ ...state, description: event.target.value })}
          placeholder="補充這筆交易的背景"
        />
      </div>
    </div>
  );
}
