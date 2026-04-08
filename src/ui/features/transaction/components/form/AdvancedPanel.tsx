import { Label } from '@/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';
import { Textarea } from '@/ui/components/ui/textarea';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import {
  type AdvancedFormState,
  type TransactionFormProjectOption,
} from '@/ui/features/transaction/types/transaction';

import { AmountDateFields } from './AmountDateFields';
import { ChipGroup } from './ChipGroup';

type AdvancedPanelProps = {
  state: AdvancedFormState;
  projects: TransactionFormProjectOption[];
  allLedgerCodes: LedgerCodeItem[];
  onChange: (next: AdvancedFormState) => void;
};

const toProjectOptions = (projects: TransactionFormProjectOption[]) =>
  projects.map((project) => ({
    value: project.id,
    label: `${project.icon ? `${project.icon} ` : ''}${project.name}`,
  }));

export function AdvancedPanel({ state, projects, allLedgerCodes, onChange }: AdvancedPanelProps) {
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
        <Select
          value={state.ledgerCode ?? undefined}
          onValueChange={(ledgerCode) => onChange({ ...state, ledgerCode })}
        >
          <SelectTrigger>
            <SelectValue placeholder="選擇會計科目..." />
          </SelectTrigger>
          <SelectContent>
            {allLedgerCodes.map((opt) => (
              <SelectItem key={opt.code} value={opt.code}>
                {opt.label} ({opt.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
