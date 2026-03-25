import React, { useMemo, useState } from 'react';

import {
  ArrowRightLeft,
  CreditCard,
  HandCoins,
  Landmark,
  ReceiptText,
  SlidersHorizontal,
} from 'lucide-react';

import { type DebtAccount } from '@/domains/debt/schemas';
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
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { AdvancedPanel } from '@/ui/features/transaction/components/form/AdvancedPanel';
import { CategoryPanel } from '@/ui/features/transaction/components/form/CategoryPanel';
import {
  type DebtPaymentFormState,
  DebtPaymentPanel,
} from '@/ui/features/transaction/components/form/DebtPaymentPanel';
import { ExpensePanel } from '@/ui/features/transaction/components/form/ExpensePanel';
import { IncomePanel } from '@/ui/features/transaction/components/form/IncomePanel';
import { ProjectTransferPanel } from '@/ui/features/transaction/components/form/ProjectTransferPanel';
import {
  buildPreview,
  buildPreviewDetails,
} from '@/ui/features/transaction/components/form/transactionFormPreview';
import {
  type AdvancedFormState,
  type ExpenseFormState,
  type FinancingFormState,
  type IncomeFormState,
  type InvestmentFormState,
  type ProjectTransferFormState,
  type TransactionFormCategoryOption,
  type TransactionFormOutput,
  type TransactionFormProjectOption,
  type TransactionFormTab,
} from '@/ui/features/transaction/types/transaction';

interface TransactionFormProps {
  isOpen: boolean;
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
  debtAccounts?: DebtAccount[];
  allActiveLedgerCodes: LedgerCodeItem[];
}

const createExpenseState = (): ExpenseFormState => ({
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  projectId: null,
  intent: null,
  ledgerCode: null,
  description: '',
  triggerAllocation: false,
  allocationItems: [],
});

const createIncomeState = (): IncomeFormState => ({
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  intent: null,
  ledgerCode: null,
  description: '',
  triggerAllocation: false,
  allocationItems: [],
});

const createInvestmentState = (): InvestmentFormState => ({
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  projectId: null,
  intent: null,
  ledgerCode: null,
  description: '',
});

const createFinancingState = (): FinancingFormState => ({
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  projectId: null,
  intent: null,
  ledgerCode: null,
  description: '',
});

const createProjectTransferState = (): ProjectTransferFormState => ({
  amount: '',
  fromProjectId: null,
  toProjectId: null,
  description: '',
});

const createAdvancedState = (): AdvancedFormState => ({
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  intentType: 'MANUAL',
  projectId: null,
  intent: null,
  ledgerCode: null,
  description: '',
});

const createDebtPaymentState = (): DebtPaymentFormState => ({
  debtAccountId: null,
  date: new Date().toISOString().slice(0, 10),
  totalPayment: '',
  projectId: null,
  description: '',
});

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
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
  debtAccounts = [],
  allActiveLedgerCodes,
}) => {
  const [activeTab, setActiveTab] = useState<TransactionFormTab>('EXPENSE');
  const [expense, setExpense] = useState<ExpenseFormState>(createExpenseState);
  const [income, setIncome] = useState<IncomeFormState>(createIncomeState);
  const [investment, setInvestment] = useState<InvestmentFormState>(createInvestmentState);
  const [financing, setFinancing] = useState<FinancingFormState>(createFinancingState);
  const [projectTransfer, setProjectTransfer] = useState<ProjectTransferFormState>(
    createProjectTransferState,
  );
  const [advanced, setAdvanced] = useState<AdvancedFormState>(createAdvancedState);
  const [debtPayment, setDebtPayment] = useState<DebtPaymentFormState>(createDebtPaymentState);

  const resetAll = () => {
    setActiveTab('EXPENSE');
    setExpense(createExpenseState());
    setIncome(createIncomeState());
    setInvestment(createInvestmentState());
    setFinancing(createFinancingState());
    setProjectTransfer(createProjectTransferState());
    setAdvanced(createAdvancedState());
    setDebtPayment(createDebtPaymentState());
  };

  const preview = useMemo(
    () =>
      buildPreview({
        activeTab,
        expense,
        income,
        investment,
        financing,
        projectTransfer,
        advanced,
        debtPayment,
        debtAccounts,
      }),
    [
      activeTab,
      advanced,
      expense,
      financing,
      income,
      investment,
      projectTransfer,
      debtPayment,
      debtAccounts,
    ],
  );

  const previewDetails = useMemo(
    () =>
      buildPreviewDetails({
        preview,
        projects,
        expenseCategories,
        incomeCategories,
        investmentCategories,
        financingCategories,
        advancedCategories,
      }),
    [
      preview,
      projects,
      expenseCategories,
      incomeCategories,
      investmentCategories,
      financingCategories,
      advancedCategories,
    ],
  );

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetAll();
      onClose();
    }
  };

  const handleCancel = () => {
    resetAll();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!preview) return;
    await onSubmit(preview);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="space-y-2">
          <Badge variant="outline" className="w-fit">
            Transaction Form
          </Badge>
          <DialogTitle>新增交易</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TransactionFormTab)}
          >
            <TabsList className="grid h-auto w-full grid-cols-3 gap-2 rounded-xl p-2 md:grid-cols-7">
              <TabsTrigger value="EXPENSE" className="gap-1">
                <ReceiptText className="h-3.5 w-3.5" />
                支出
              </TabsTrigger>
              <TabsTrigger value="INCOME" className="gap-1">
                <Landmark className="h-3.5 w-3.5" />
                收入
              </TabsTrigger>
              <TabsTrigger value="INVESTMENT" className="gap-1">
                <Landmark className="h-3.5 w-3.5" />
                投資
              </TabsTrigger>
              <TabsTrigger value="FINANCING" className="gap-1">
                <HandCoins className="h-3.5 w-3.5" />
                融資
              </TabsTrigger>
              <TabsTrigger value="TRANSFER" className="gap-1">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                專案轉帳
              </TabsTrigger>
              <TabsTrigger value="DEBT_PAYMENT" className="gap-1">
                <CreditCard className="h-3.5 w-3.5" />
                還款
              </TabsTrigger>
              <TabsTrigger value="ADVANCED" className="gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                進階
              </TabsTrigger>
            </TabsList>

            <TabsContent value="EXPENSE" className="mt-4">
              <ExpensePanel
                state={expense}
                projects={projects}
                categories={expenseCategories}
                allLedgerCodes={allActiveLedgerCodes}
                onChange={setExpense}
              />
            </TabsContent>

            <TabsContent value="INCOME" className="mt-4">
              <IncomePanel
                state={income}
                categories={incomeCategories}
                projects={projects}
                allLedgerCodes={allActiveLedgerCodes}
                onChange={setIncome}
              />
            </TabsContent>

            <TabsContent value="INVESTMENT" className="mt-4">
              <CategoryPanel
                title="投資"
                tone="neutral"
                state={investment}
                categories={investmentCategories}
                projects={projects}
                allLedgerCodes={allActiveLedgerCodes}
                onChange={setInvestment}
              />
            </TabsContent>

            <TabsContent value="FINANCING" className="mt-4">
              <CategoryPanel
                title="融資"
                tone="neutral"
                state={financing}
                categories={financingCategories}
                projects={projects}
                allLedgerCodes={allActiveLedgerCodes}
                onChange={setFinancing}
              />
            </TabsContent>

            <TabsContent value="TRANSFER" className="mt-4">
              <ProjectTransferPanel
                state={projectTransfer}
                projects={projects}
                onChange={setProjectTransfer}
              />
            </TabsContent>

            <TabsContent value="ADVANCED" className="mt-4">
              <AdvancedPanel
                state={advanced}
                projects={projects}
                allLedgerCodes={allActiveLedgerCodes}
                onChange={setAdvanced}
              />
            </TabsContent>

            <TabsContent value="DEBT_PAYMENT" className="mt-4">
              <DebtPaymentPanel
                state={debtPayment}
                debtAccounts={debtAccounts}
                projects={projects}
                onChange={setDebtPayment}
              />
            </TabsContent>
          </Tabs>

          {preview ? (
            <div className="rounded-2xl border bg-slate-900 px-4 py-3 text-white">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Preview</div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <Badge className="border-none bg-white/15 text-white">{preview.intentType}</Badge>
                {previewDetails.map((detail) => (
                  <span key={detail} className="rounded-full border border-white/10 px-3 py-1">
                    {detail}
                  </span>
                ))}
                <span className="ml-auto font-semibold">NT$ {preview.amount.toLocaleString()}</span>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !preview}>
              {loading ? '送出中...' : '送出'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
