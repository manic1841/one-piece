import React from 'react';

import { HandCoins, Landmark, ReceiptText, SlidersHorizontal } from 'lucide-react';

import { Form } from '@/ui/components/form';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { getIntentTypeLabel } from '@/ui/constants/transaction';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { AdvancedPanel } from '@/ui/features/transaction/components/form/AdvancedPanel';
import { CategoryPanel } from '@/ui/features/transaction/components/form/CategoryPanel';
import { ExpensePanel } from '@/ui/features/transaction/components/form/ExpensePanel';
import { IncomePanel } from '@/ui/features/transaction/components/form/IncomePanel';
import { useTransactionFormState } from '@/ui/features/transaction/hooks/useTransactionFormState';
import { type AllocationItemInput } from '@/ui/features/transaction/types/allocation';
import {
  type TransactionFormCategoryOption,
  type TransactionFormOutput,
  type TransactionFormProjectOption,
  type TransactionFormTab,
} from '@/ui/features/transaction/types/transaction';

interface TransactionFormProps {
  isOpen: boolean;
  mode?: 'create' | 'edit';
  initialOutput?: TransactionFormOutput | null;
  onClose: () => void;
  onSubmit: (output: TransactionFormOutput) => void | Promise<void>;
  loading?: boolean;
  error?: string;
  projects: TransactionFormProjectOption[];
  expenseCategories: TransactionFormCategoryOption[];
  incomeCategories: TransactionFormCategoryOption[];
  investmentCategories: TransactionFormCategoryOption[];
  financingCategories: TransactionFormCategoryOption[];
  advancedCategories: TransactionFormCategoryOption[];
  allActiveLedgerCodes: LedgerCodeItem[];
  loadIncomeAllocationTemplate?: (ledgerCode: string) => Promise<AllocationItemInput[] | null>;
}

/**
 * Surface for the transaction dialog. Each tab panel is wrapped in its own
 * `<Form>` (RHF provider) and binds its own fields; the tab selection and the
 * derived preview come from the Controller hook. The page only renders.
 */
export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  mode = 'create',
  initialOutput,
  onClose,
  onSubmit,
  loading = false,
  error,
  projects,
  expenseCategories,
  incomeCategories,
  investmentCategories,
  financingCategories,
  advancedCategories,
  allActiveLedgerCodes,
  loadIncomeAllocationTemplate,
}) => {
  const {
    activeTab,
    setActiveTab,
    expenseForm,
    incomeForm,
    investmentForm,
    financingForm,
    advancedForm,
    preview,
    previewDetails,
    submit,
  } = useTransactionFormState({
    initialOutput,
    onSubmit,
    projects,
    expenseCategories,
    incomeCategories,
    investmentCategories,
    financingCategories,
    advancedCategories,
    loadIncomeAllocationTemplate,
  });

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader className="space-y-2">
          <Badge variant="outline" className="w-fit">
            Transaction Form
          </Badge>
          <DialogTitle>{mode === 'edit' ? '編輯交易' : '新增交易'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {error ? (
            <div className="rounded-lg border border-negative/20 bg-negative/10 px-4 py-3 text-sm text-negative">
              {error}
            </div>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TransactionFormTab)}
          >
            <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-lg p-2 md:grid-cols-5">
              <TabsTrigger value="EXPENSE" className="gap-1">
                <ReceiptText className="h-3.5 w-3.5" />
                {getIntentTypeLabel('EXPENSE')}
              </TabsTrigger>
              <TabsTrigger value="INCOME" className="gap-1">
                <Landmark className="h-3.5 w-3.5" />
                {getIntentTypeLabel('INCOME')}
              </TabsTrigger>
              <TabsTrigger value="INVESTMENT" className="gap-1">
                <Landmark className="h-3.5 w-3.5" />
                {getIntentTypeLabel('INVESTMENT')}
              </TabsTrigger>
              <TabsTrigger value="FINANCING" className="gap-1">
                <HandCoins className="h-3.5 w-3.5" />
                {getIntentTypeLabel('FINANCING')}
              </TabsTrigger>
              <TabsTrigger value="ADVANCED" className="gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                進階
              </TabsTrigger>
            </TabsList>

            <TabsContent value="EXPENSE" className="mt-4">
              <Form {...expenseForm}>
                <ExpensePanel
                  projects={projects}
                  categories={expenseCategories}
                  allLedgerCodes={allActiveLedgerCodes}
                />
              </Form>
            </TabsContent>

            <TabsContent value="INCOME" className="mt-4">
              <Form {...incomeForm}>
                <IncomePanel
                  categories={incomeCategories}
                  projects={projects}
                  allLedgerCodes={allActiveLedgerCodes}
                />
              </Form>
            </TabsContent>

            <TabsContent value="INVESTMENT" className="mt-4">
              <Form {...investmentForm}>
                <CategoryPanel
                  title={getIntentTypeLabel('INVESTMENT')}
                  tone="neutral"
                  categories={investmentCategories}
                  projects={projects}
                  allLedgerCodes={allActiveLedgerCodes}
                />
              </Form>
            </TabsContent>

            <TabsContent value="FINANCING" className="mt-4">
              <Form {...financingForm}>
                <CategoryPanel
                  title={getIntentTypeLabel('FINANCING')}
                  tone="neutral"
                  categories={financingCategories}
                  projects={projects}
                  allLedgerCodes={allActiveLedgerCodes}
                />
              </Form>
            </TabsContent>

            <TabsContent value="ADVANCED" className="mt-4">
              <Form {...advancedForm}>
                <AdvancedPanel projects={projects} allLedgerCodes={allActiveLedgerCodes} />
              </Form>
            </TabsContent>
          </Tabs>

          {preview ? (
            <div className="rounded-lg border bg-primary px-4 py-3 text-primary-foreground">
              <div className="text-xs uppercase tracking-[0.2em] text-primary-foreground">
                Preview
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <Badge className="border-none bg-foreground/15 text-primary-foreground">
                  {getIntentTypeLabel(preview.intentType)}
                </Badge>
                {previewDetails.map((detail) => (
                  <span key={detail} className="rounded border border-foreground/10 px-3 py-1">
                    {detail}
                  </span>
                ))}
                <span className="ml-auto font-semibold">NT$ {preview.amount.toLocaleString()}</span>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !preview}>
              {loading ? '送出中...' : mode === 'edit' ? '更新交易' : '送出'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
