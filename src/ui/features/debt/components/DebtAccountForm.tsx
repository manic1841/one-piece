import React from 'react';

import { DEBT_TYPE_LABEL, type DebtType } from '@/domains/debt/schemas';
import { type Project } from '@/domains/project/schemas';
import { Button } from '@/ui/components/ui/button';
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
import { type DebtAccountFormHook } from '@/ui/features/debt/hooks/useDebtAccountForm';

interface DebtAccountFormProps {
  form: DebtAccountFormHook;
  projects: Project[];
  submitLabel?: string;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function formatCurrency(n: number) {
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-1">{msg}</p>;
}

export function DebtAccountForm({
  form,
  projects,
  submitLabel = '儲存',
  onSubmit,
  onCancel,
  loading,
}: DebtAccountFormProps) {
  const { values, calcResult, isManualPayment, errors, setField, resetCalc } = form;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* 貸款名稱 */}
      <div className="space-y-1.5">
        <Label htmlFor="df-name">貸款名稱 *</Label>
        <Input
          id="df-name"
          placeholder="e.g. 玉山房貸"
          value={values.name}
          onChange={(e) => setField('name', e.target.value)}
        />
        <FieldError msg={errors.name} />
      </div>

      {/* 貸款類型 */}
      <div className="space-y-1.5">
        <Label htmlFor="df-type">貸款類型 *</Label>
        <Select value={values.type} onValueChange={(v) => setField('type', v as DebtType)}>
          <SelectTrigger id="df-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(DEBT_TYPE_LABEL) as [DebtType, string][]).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError msg={errors.type} />
      </div>

      {/* 金額欄位 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="df-orig">原始貸款金額 *</Label>
          <Input
            id="df-orig"
            type="number"
            min="1"
            placeholder="8000000"
            value={values.originalAmount}
            onChange={(e) => setField('originalAmount', e.target.value)}
          />
          <FieldError msg={errors.originalAmount} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="df-balance">目前餘額 *</Label>
          <Input
            id="df-balance"
            type="number"
            min="1"
            placeholder="6000000"
            value={values.currentBalance}
            onChange={(e) => setField('currentBalance', e.target.value)}
          />
          <FieldError msg={errors.currentBalance} />
        </div>
      </div>

      {/* 年利率 */}
      <div className="space-y-1.5">
        <Label htmlFor="df-rate">年利率 (%)*</Label>
        <Input
          id="df-rate"
          type="number"
          min="0"
          step="0.01"
          placeholder="2.5"
          value={values.interestRate}
          onChange={(e) => setField('interestRate', e.target.value)}
        />
        <FieldError msg={errors.interestRate} />
      </div>

      {/* 日期 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="df-start">還款開始日 *</Label>
          <Input
            id="df-start"
            type="date"
            value={values.startDate}
            onChange={(e) => setField('startDate', e.target.value)}
          />
          <FieldError msg={errors.startDate} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="df-end">貸款到期日 *</Label>
          <Input
            id="df-end"
            type="date"
            value={values.endDate}
            onChange={(e) => setField('endDate', e.target.value)}
          />
          <FieldError msg={errors.endDate} />
        </div>
      </div>

      {/* 試算摘要 */}
      {calcResult && (
        <div className="bg-muted rounded-md px-4 py-3 flex items-center gap-4 text-sm flex-wrap">
          <span>
            總期數：<strong className="font-semibold">{calcResult.totalMonths} 期</strong>
          </span>
          <span>
            總利息：<strong className="font-semibold">${formatCurrency(calcResult.totalInterest)}</strong>
          </span>
          {isManualPayment && (
            <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={resetCalc}>
              重新試算
            </Button>
          )}
        </div>
      )}

      {/* 每月應還金額 */}
      <div className="space-y-1.5">
        <Label htmlFor="df-monthly">
          每月應還金額 *
          {isManualPayment && (
            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">手動</span>
          )}
        </Label>
        <Input
          id="df-monthly"
          type="number"
          min="1"
          value={values.monthlyPayment}
          onChange={(e) => setField('monthlyPayment', e.target.value)}
        />
        <FieldError msg={errors.monthlyPayment} />
      </div>

      {/* 對應專案 */}
      <div className="space-y-1.5">
        <Label htmlFor="df-project">對應專案</Label>
        <Select
          value={values.linkedProjectId || '__none__'}
          onValueChange={(v) => setField('linkedProjectId', v === '__none__' ? '' : v)}
        >
          <SelectTrigger id="df-project">
            <SelectValue placeholder="— 無 —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— 無 —</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 備註 */}
      <div className="space-y-1.5">
        <Label htmlFor="df-note">備註</Label>
        <Textarea
          id="df-note"
          rows={3}
          value={values.note}
          onChange={(e) => setField('note', e.target.value)}
        />
      </div>

      {/* 操作 */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? '儲存中…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
