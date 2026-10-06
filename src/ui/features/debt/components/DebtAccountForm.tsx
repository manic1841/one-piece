import React from 'react';

import {
  DateInput,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  SelectField,
  TextArea,
  TextInput,
} from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { DEBT_NO_PROJECT_LABEL, DebtTypeOptions } from '@/ui/constants/debt/label';
import { type DebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';
import { formatCurrency } from '@/ui/utils';

interface DebtAccountFormProps {
  vm: DebtAccountFormViewModel;
}

export function DebtAccountForm({ vm }: DebtAccountFormProps) {
  const {
    form,
    values,
    calcResult,
    isManualPayment,
    isCreateMode,
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
    <Form {...form}>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <FormField name="name">
          <FormItem>
            <FormLabel required>貸款名稱</FormLabel>
            <FormControl>
              <TextInput placeholder="e.g. 玉山房貸" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="type">
          <FormItem>
            <FormLabel required>貸款類型</FormLabel>
            <FormControl>
              <SelectField options={DebtTypeOptions} />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField name="originalAmount">
            <FormItem>
              <FormLabel required>原始貸款金額</FormLabel>
              <FormControl>
                <NumberInput min="1" placeholder="8000000" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="currentBalance">
            <FormItem>
              <FormLabel required>目前餘額</FormLabel>
              <FormControl>
                <NumberInput min="1" placeholder="6000000" disabled={isCreateMode} />
              </FormControl>
              {isCreateMode && (
                <FormDescription>
                  建立時會自動等於原始貸款金額，後續由還款自動遞減。
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <FormField name="interestRate">
          <FormItem>
            <FormLabel required>年利率 (%)</FormLabel>
            <FormControl>
              <NumberInput min="0" step="0.01" placeholder="2.5" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField name="startDate">
            <FormItem>
              <FormLabel required>還款開始日</FormLabel>
              <FormControl>
                <DateInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="endDate">
            <FormItem>
              <FormLabel required>貸款到期日</FormLabel>
              <FormControl>
                <DateInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <FormField name="graceEndDate">
          <FormItem>
            <FormLabel>寬限期結束日（選填）</FormLabel>
            <FormControl>
              <DateInput />
            </FormControl>
            <FormDescription>
              留空表示無寬限期。設定後，前端將動態判斷是否在寬限期內。
            </FormDescription>
            <FormMessage />
          </FormItem>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField name="disbursementDate">
            <FormItem>
              <FormLabel required={isCreateMode}>撥款日期</FormLabel>
              <FormControl>
                <DateInput />
              </FormControl>
              <FormDescription>
                預設為還款開始日，建立貸款時會寫入借款入帳交易日期。
              </FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>
          <FormField name="disbursementDescription">
            <FormItem>
              <FormLabel>撥款說明（選填）</FormLabel>
              <FormControl>
                <TextInput placeholder={`${values.name || '貸款'} 借款入帳`} />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        {calcResult && (
          <div className="bg-muted rounded-md px-4 py-4 space-y-3 text-sm">
            {!calcResult.graceMonths && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>總期數：</span>
                  <strong className="font-semibold">{calcResult.totalMonths} 期</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>總利息：</span>
                  <strong className="font-semibold">
                    {formatCurrency(calcResult.totalInterest)}
                  </strong>
                </div>
              </div>
            )}

            {calcResult.graceMonths !== undefined && calcResult.graceMonths > 0 && (
              <div className="space-y-2">
                <Alert variant="warning">
                  <AlertDescription>寬限期設定</AlertDescription>
                </Alert>
                <div className="flex items-center justify-between">
                  <span>寬限期月數：</span>
                  <strong className="font-semibold">{calcResult.graceMonths} 期</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>寬限期每月應付（利息）：</span>
                  <strong className="font-semibold">
                    {formatCurrency(calcResult.graceMonthlyPayment ?? 0)}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>正式還款月數：</span>
                  <strong className="font-semibold">{calcResult.normalMonths} 期</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>正式還款每月應付：</span>
                  <strong className="font-semibold text-destructive">
                    {formatCurrency(calcResult.monthlyPayment)}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>總利息：</span>
                  <strong className="font-semibold">
                    {formatCurrency(calcResult.totalInterest)}
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

        <FormField name="monthlyPayment">
          <FormItem>
            <FormLabel required>
              {calcResult?.graceMonths ? '正式還款期間的每月應還金額' : '每月應還金額'}
              {isManualPayment && (
                <span className="ml-2 text-xs bg-warning/10 text-warning px-1.5 py-0.5 rounded">
                  手動
                </span>
              )}
            </FormLabel>
            <FormControl>
              <NumberInput min="1" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        <FormField name="linkedProjectId">
          <FormItem>
            <FormLabel>對應專案</FormLabel>
            <FormControl>
              <SelectField
                options={projects.map((project) => ({
                  value: project.id,
                  label: project.name,
                }))}
                noneLabel={DEBT_NO_PROJECT_LABEL}
                placeholder={DEBT_NO_PROJECT_LABEL}
              />
            </FormControl>
          </FormItem>
        </FormField>

        <FormField name="note">
          <FormItem>
            <FormLabel>備註</FormLabel>
            <FormControl>
              <TextArea rows={3} />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
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
    </Form>
  );
}
