import { Checkbox } from '@/ui/components/ui/checkbox';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import { Textarea } from '@/ui/components/ui/textarea';
import {
  type AdvancedFormState,
  type ExpenseFormState,
  type FinancingFormState,
  type IncomeFormState,
  type InvestmentFormState,
  type ProjectTransferFormState,
  type TransactionFormCategoryOption,
  type TransactionFormProjectOption,
} from '@/ui/features/transaction/types/transaction';
import { cn } from '@/ui/utils/cn';

import { AllocationSection } from './AllocationSection';

type ChipGroupProps = {
  options: Array<{ value: string; label: string }>;
  value: string | null;
  onChange: (value: string) => void;
  tone: 'expense' | 'income' | 'neutral';
};

export function ChipGroup({ options, value, onChange, tone }: ChipGroupProps) {
  const toneClass = {
    expense: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100',
    income:
      'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100',
    neutral:
      'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100',
  };

  const activeClass = {
    expense: 'border-rose-500 bg-rose-600 text-white',
    income: 'border-emerald-500 bg-emerald-600 text-white',
    neutral: 'border-slate-500 bg-slate-700 text-white',
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              selected ? activeClass[tone] : toneClass[tone],
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const toProjectOptions = (projects: TransactionFormProjectOption[]) =>
  projects.map((project) => ({
    value: project.id,
    label: `${project.icon ? `${project.icon} ` : ''}${project.name}`,
  }));

type AmountDateFieldsProps = {
  amountId: string;
  dateId: string;
  amount: string;
  date: string;
  amountLabel?: string;
  dateLabel?: string;
  onAmountChange: (value: string) => void;
  onDateChange: (value: string) => void;
};

export function AmountDateFields(props: AmountDateFieldsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={props.amountId}>{props.amountLabel ?? '金額'}</Label>
        <Input
          id={props.amountId}
          type="number"
          min="0.01"
          step="0.01"
          value={props.amount}
          onChange={(event) => props.onAmountChange(event.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={props.dateId}>{props.dateLabel ?? '日期'}</Label>
        <Input
          id={props.dateId}
          type="date"
          value={props.date}
          onChange={(event) => props.onDateChange(event.target.value)}
        />
      </div>
    </div>
  );
}

type CategoryPanelProps = {
  title: string;
  tone: 'expense' | 'income' | 'neutral';
  state: InvestmentFormState | FinancingFormState;
  categories: TransactionFormCategoryOption[];
  onChange: (next: InvestmentFormState | FinancingFormState) => void;
};

export function CategoryPanel({ title, tone, state, categories, onChange }: CategoryPanelProps) {
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
        <Label>類別</Label>
        <ChipGroup
          options={categories}
          value={state.ledgerCode}
          onChange={(ledgerCode) => onChange({ ...state, ledgerCode })}
          tone={tone}
        />
      </div>
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

type ExpensePanelProps = {
  state: ExpenseFormState;
  projects: TransactionFormProjectOption[];
  categories: TransactionFormCategoryOption[];
  onChange: (next: ExpenseFormState) => void;
};

export function ExpensePanel({ state, projects, categories, onChange }: ExpensePanelProps) {
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
          value={state.ledgerCode}
          onChange={(ledgerCode) => onChange({ ...state, ledgerCode })}
          tone="expense"
        />
      </div>
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

type IncomePanelProps = {
  state: IncomeFormState;
  categories: TransactionFormCategoryOption[];
  projects: TransactionFormProjectOption[];
  onChange: (next: IncomeFormState) => void;
};

export function IncomePanel({ state, categories, projects, onChange }: IncomePanelProps) {
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
          value={state.ledgerCode}
          onChange={(ledgerCode) => onChange({ ...state, ledgerCode })}
          tone="income"
        />
      </div>
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

type ProjectTransferPanelProps = {
  state: ProjectTransferFormState;
  projects: TransactionFormProjectOption[];
  onChange: (next: ProjectTransferFormState) => void;
};

export function ProjectTransferPanel({ state, projects, onChange }: ProjectTransferPanelProps) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="space-y-2">
        <Label htmlFor="project-transfer-amount">金額</Label>
        <Input
          id="project-transfer-amount"
          type="number"
          min="0.01"
          step="0.01"
          value={state.amount}
          onChange={(event) => onChange({ ...state, amount: event.target.value })}
          placeholder="0.00"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>從專案</Label>
          <Select
            value={state.fromProjectId ?? undefined}
            onValueChange={(fromProjectId) => onChange({ ...state, fromProjectId })}
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇來源專案" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.icon ? `${project.icon} ` : ''}
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>到專案</Label>
          <Select
            value={state.toProjectId ?? undefined}
            onValueChange={(toProjectId) => onChange({ ...state, toProjectId })}
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇目標專案" />
            </SelectTrigger>
            <SelectContent>
              {projects
                .filter((project) => project.id !== state.fromProjectId)
                .map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.icon ? `${project.icon} ` : ''}
                    {project.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="project-transfer-description">說明</Label>
        <Textarea
          id="project-transfer-description"
          value={state.description}
          onChange={(event) => onChange({ ...state, description: event.target.value })}
          placeholder="例如：補貼旅遊專案"
        />
      </div>
    </div>
  );
}

type AdvancedPanelProps = {
  state: AdvancedFormState;
  projects: TransactionFormProjectOption[];
  categories: TransactionFormCategoryOption[];
  onChange: (next: AdvancedFormState) => void;
};

export function AdvancedPanel({ state, projects, categories, onChange }: AdvancedPanelProps) {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <AmountDateFields
        amountId="advanced-amount"
        dateId="advanced-date"
        amount={state.amount}
        date={state.date}
        onAmountChange={(amount) => onChange({ ...state, amount })}
        onDateChange={(date) => onChange({ ...state, date })}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Intent Type</Label>
          <Select
            value={state.intentType}
            onValueChange={(intentType) =>
              onChange({
                ...state,
                intentType: intentType as AdvancedFormState['intentType'],
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="選擇進階意圖" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MANUAL">MANUAL</SelectItem>
              <SelectItem value="TRANSFER">TRANSFER</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>專案 (選填)</Label>
          <ChipGroup
            options={toProjectOptions(projects)}
            value={state.projectId}
            onChange={(projectId) => onChange({ ...state, projectId })}
            tone="neutral"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>科目 / 類別</Label>
        <ChipGroup
          options={categories}
          value={state.ledgerCode}
          onChange={(ledgerCode) => onChange({ ...state, ledgerCode })}
          tone="neutral"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="advanced-description">說明</Label>
        <Textarea
          id="advanced-description"
          value={state.description}
          onChange={(event) => onChange({ ...state, description: event.target.value })}
          placeholder="補充分錄背景"
        />
      </div>
    </div>
  );
}
