import { useMemo } from 'react';

import { calculateSplit } from '@/domains/debt/debtPaymentCalculator';
import { type DebtAccount, DEBT_TYPE_LABEL } from '@/domains/debt/schemas';
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
import { type TransactionFormProjectOption } from '@/ui/features/transaction/types/transaction';

export type DebtPaymentFormState = {
  debtAccountId: string | null;
  date: string;
  totalPayment: string;
  projectId: string | null;
  description: string;
};

interface DebtPaymentPanelProps {
  state: DebtPaymentFormState;
  debtAccounts: DebtAccount[];
  projects: TransactionFormProjectOption[];
  onChange: (next: DebtPaymentFormState) => void;
}

function formatCurrency(n: number) {
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

export function DebtPaymentPanel({ state, debtAccounts, projects, onChange }: DebtPaymentPanelProps) {
  const selectedAccount = useMemo(
    () => (state.debtAccountId ? debtAccounts.find((a) => a.id === state.debtAccountId) : null),
    [state.debtAccountId, debtAccounts],
  );

  // Auto-fill when account selected
  const handleAccountChange = (id: string) => {
    const account = debtAccounts.find((a) => a.id === id) ?? null;
    const yearMonth = state.date.slice(0, 7);
    const defaultDesc = account
      ? `${account.name} ${yearMonth} 還款`
      : '';

    onChange({
      ...state,
      debtAccountId: id,
      totalPayment: account ? String(account.monthlyPayment) : '',
      projectId: account?.linkedProjectId ?? null,
      description: defaultDesc,
    });
  };

  const totalPaymentNum = parseFloat(state.totalPayment) || 0;
  const split = selectedAccount
    ? calculateSplit(selectedAccount.currentBalance, selectedAccount.interestRate, totalPaymentNum)
    : null;

  return (
    <div className="space-y-5 rounded-2xl border border-blue-200 bg-white p-5">
      {/* 選擇貸款 */}
      <div className="space-y-2">
        <Label>選擇貸款 *</Label>
        <Select value={state.debtAccountId ?? undefined} onValueChange={handleAccountChange}>
          <SelectTrigger>
            <SelectValue placeholder="請選擇貸款帳戶" />
          </SelectTrigger>
          <SelectContent>
            {debtAccounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                <span>{a.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {DEBT_TYPE_LABEL[a.type]} · 餘額 ${formatCurrency(a.currentBalance)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 日期 + 總還款 */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dp-date">還款日期</Label>
          <Input
            id="dp-date"
            type="date"
            value={state.date}
            onChange={(e) => onChange({ ...state, date: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dp-total">總還款金額 *</Label>
          <Input
            id="dp-total"
            type="number"
            min="1"
            value={state.totalPayment}
            onChange={(e) => onChange({ ...state, totalPayment: e.target.value })}
          />
        </div>
      </div>

      {/* 本金/利息 拆分顯示 */}
      {split && totalPaymentNum > 0 && (
        <div className={`rounded-xl px-4 py-3 text-sm space-y-1 ${
          split.warning
            ? 'bg-amber-50 border border-amber-200 text-amber-800'
            : 'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          {split.warning ? (
            <p className="font-medium">⚠️ {split.warning}</p>
          ) : (
            <>
              <div className="flex justify-between">
                <span>本月本金</span>
                <strong>${formatCurrency(split.principal)}</strong>
              </div>
              <div className="flex justify-between">
                <span>本月利息</span>
                <strong>${formatCurrency(split.interest)}</strong>
              </div>
              <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                <span>合計</span>
                <strong>${formatCurrency(split.principal + split.interest)}</strong>
              </div>
            </>
          )}
        </div>
      )}

      {/* 扣款專案 */}
      <div className="space-y-2">
        <Label>扣款專案（選填）</Label>
        <Select
          value={state.projectId ?? '__none__'}
          onValueChange={(v) => onChange({ ...state, projectId: v === '__none__' ? null : v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="— 無 —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— 無 —</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.icon ? `${p.icon} ` : ''}{p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 說明 */}
      <div className="space-y-2">
        <Label htmlFor="dp-desc">說明</Label>
        <Textarea
          id="dp-desc"
          value={state.description}
          onChange={(e) => onChange({ ...state, description: e.target.value })}
          placeholder="例如：玉山房貸 2026-03 還款"
        />
      </div>
    </div>
  );
}
