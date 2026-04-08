import React from 'react';

import { DEBT_TYPE_LABEL, type DebtType } from '@/domains/debt/schemas';
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
import { type DebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';

interface DebtAccountFormProps {
  vm: DebtAccountFormViewModel;
}

function formatCurrency(n: number) {
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-destructive mt-1">{msg}</p>;
}

export function DebtAccountForm({ vm }: DebtAccountFormProps) {
  const {
    values,
    calcResult,
    isManualPayment,
    isCreateMode,
    errors,
    setField,
    resetCalc,
    projects,
    submitLabel,
    submit,
    cancel,
    loading,
    error,
  } = vm;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit();
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
            disabled={isCreateMode}
          />
          {isCreateMode && (
            <p className="text-xs text-muted-foreground">
              建立時會自動等於原始貸款金額，後續由還款自動遞減。
            </p>
          )}
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

      {/* 寬限期結束日（非必填） */}
      <div className="space-y-1.5">
        <Label htmlFor="df-grace-end">寬限期結束日（選填）</Label>
        <Input
          id="df-grace-end"
          type="date"
          value={values.graceEndDate}
          onChange={(e) => setField('graceEndDate', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          留空表示無寬限期。設定後，前端將動態判斷是否在寬限期內。
        </p>
        <FieldError msg={errors.graceEndDate} />
      </div>

      {/* 撥款交易資訊（建立時使用） */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="df-disbursement-date">撥款日期{isCreateMode ? ' *' : ''}</Label>
          <Input
            id="df-disbursement-date"
            type="date"
            value={values.disbursementDate}
            onChange={(e) => setField('disbursementDate', e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            預設為還款開始日，建立貸款時會寫入借款入帳交易日期。
          </p>
          <FieldError msg={errors.disbursementDate} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="df-disbursement-description">撥款說明（選填）</Label>
          <Input
            id="df-disbursement-description"
            placeholder={`${values.name || '貸款'} 借款入帳`}
            value={values.disbursementDescription}
            onChange={(e) => setField('disbursementDescription', e.target.value)}
          />
        </div>
      </div>

      {/* 試算摘要 */}
      {calcResult && (
        <div className="bg-muted rounded-md px-4 py-4 space-y-3 text-sm">
          {/* 無寬限期的試算結果 */}
          {!calcResult.graceMonths && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>總期數：</span>
                <strong className="font-semibold">{calcResult.totalMonths} 期</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>總利息：</span>
                <strong className="font-semibold">
                  ${formatCurrency(calcResult.totalInterest)}
                </strong>
              </div>
            </div>
          )}

          {/* 有寬限期的試算結果 */}
          {calcResult.graceMonths !== undefined && calcResult.graceMonths > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                ⚠️ 寬限期設定
              </div>
              <div className="flex items-center justify-between">
                <span>寬限期月數：</span>
                <strong className="font-semibold">{calcResult.graceMonths} 期</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>寬限期每月應付（利息）：</span>
                <strong className="font-semibold">
                  ${formatCurrency(calcResult.graceMonthlyPayment ?? 0)}
                </strong>
              </div>
              <hr className="my-1" />
              <div className="flex items-center justify-between">
                <span>正式還款月數：</span>
                <strong className="font-semibold">{calcResult.normalMonths} 期</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>正式還款每月應付：</span>
                <strong className="font-semibold text-destructive">
                  ${formatCurrency(calcResult.monthlyPayment)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span>總利息：</span>
                <strong className="font-semibold">
                  ${formatCurrency(calcResult.totalInterest)}
                </strong>
              </div>
            </div>
          )}

          {isManualPayment && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="p-0 h-auto"
              onClick={resetCalc}
            >
              重新試算
            </Button>
          )}
        </div>
      )}

      {/* 每月應還金額 */}
      <div className="space-y-1.5">
        <Label htmlFor="df-monthly">
          {calcResult?.graceMonths ? '正式還款期間的每月應還金額' : '每月應還金額'} *
          {isManualPayment && (
            <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              手動
            </span>
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
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md animate-in fade-in">
          {error}
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={cancel} disabled={loading}>
          取消
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? '儲存中…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
