import { useEffect, useMemo, useState } from 'react';

import { type DebtAccount } from '@/domains/debt/schemas';
import {
  buildPreview,
  buildPreviewDetails,
} from '@/ui/features/transaction/components/form/transactionFormPreview';
import {
  type AllocationDraftItem,
  type AllocationItemInput,
} from '@/ui/features/transaction/types/allocation';
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

import { type DebtPaymentFormState } from '../components/form/DebtPaymentPanel';

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

const toDraftAllocationItems = (items?: AllocationItemInput[]): AllocationDraftItem[] =>
  (items ?? []).map((item) => ({
    projectId: item.projectId,
    percentage: item.percentage.toString(),
  }));

const mapIntentTypeToTab = (
  intentType: TransactionFormOutput['intentType'],
): TransactionFormTab => {
  if (intentType === 'MANUAL') return 'ADVANCED';
  return intentType;
};

const toExpenseState = (output: TransactionFormOutput): ExpenseFormState => ({
  amount: output.amount.toString(),
  date: output.date,
  projectId: output.projectId ?? null,
  intent: output.intent ?? null,
  ledgerCode: output.ledgerCode ?? null,
  description: output.description ?? '',
  triggerAllocation: Boolean(output.triggerAllocation),
  allocationItems: toDraftAllocationItems(output.allocationItems),
});

const toIncomeState = (output: TransactionFormOutput): IncomeFormState => ({
  amount: output.amount.toString(),
  date: output.date,
  intent: output.intent ?? null,
  ledgerCode: output.ledgerCode ?? null,
  description: output.description ?? '',
  triggerAllocation: Boolean(output.triggerAllocation),
  allocationItems: toDraftAllocationItems(output.allocationItems),
});

const toInvestmentState = (output: TransactionFormOutput): InvestmentFormState => ({
  amount: output.amount.toString(),
  date: output.date,
  projectId: output.projectId ?? null,
  intent: output.intent ?? null,
  ledgerCode: output.ledgerCode ?? null,
  description: output.description ?? '',
});

const toFinancingState = (output: TransactionFormOutput): FinancingFormState => ({
  amount: output.amount.toString(),
  date: output.date,
  projectId: output.projectId ?? null,
  intent: output.intent ?? null,
  ledgerCode: output.ledgerCode ?? null,
  description: output.description ?? '',
});

const toProjectTransferState = (output: TransactionFormOutput): ProjectTransferFormState => ({
  amount: output.amount.toString(),
  fromProjectId: output.fromProjectId ?? null,
  toProjectId: output.toProjectId ?? null,
  description: output.description ?? '',
});

const toDebtPaymentState = (output: TransactionFormOutput): DebtPaymentFormState => ({
  debtAccountId: output.debtAccountId ?? null,
  date: output.date,
  totalPayment: output.amount.toString(),
  projectId: output.projectId ?? null,
  description: output.description ?? '',
});

const toAdvancedState = (output: TransactionFormOutput): AdvancedFormState => ({
  amount: output.amount.toString(),
  date: output.date,
  intentType: output.intentType === 'TRANSFER' ? 'TRANSFER' : 'MANUAL',
  projectId: output.projectId ?? null,
  intent: output.intent ?? null,
  ledgerCode: output.ledgerCode ?? null,
  description: output.description ?? '',
});

interface UseTransactionFormStateParams {
  isOpen: boolean;
  initialOutput?: TransactionFormOutput | null;
  projects: TransactionFormProjectOption[];
  expenseCategories: TransactionFormCategoryOption[];
  incomeCategories: TransactionFormCategoryOption[];
  investmentCategories: TransactionFormCategoryOption[];
  financingCategories: TransactionFormCategoryOption[];
  advancedCategories: TransactionFormCategoryOption[];
  debtAccounts: DebtAccount[];
  loadIncomeAllocationTemplate?: (ledgerCode: string) => Promise<AllocationItemInput[] | null>;
}

export const useTransactionFormState = ({
  isOpen,
  initialOutput,
  projects,
  expenseCategories,
  incomeCategories,
  investmentCategories,
  financingCategories,
  advancedCategories,
  debtAccounts,
  loadIncomeAllocationTemplate,
}: UseTransactionFormStateParams) => {
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

  const hydrateFromInitialOutput = (output: TransactionFormOutput) => {
    const tab = mapIntentTypeToTab(output.intentType);
    setActiveTab(tab);

    if (tab === 'EXPENSE') {
      setExpense(toExpenseState(output));
      return;
    }

    if (tab === 'INCOME') {
      setIncome(toIncomeState(output));
      return;
    }

    if (tab === 'INVESTMENT') {
      setInvestment(toInvestmentState(output));
      return;
    }

    if (tab === 'FINANCING') {
      setFinancing(toFinancingState(output));
      return;
    }

    if (tab === 'TRANSFER') {
      setProjectTransfer(toProjectTransferState(output));
      return;
    }

    if (tab === 'DEBT_PAYMENT') {
      setDebtPayment(toDebtPaymentState(output));
      return;
    }

    setAdvanced(toAdvancedState(output));
  };

  useEffect(() => {
    if (!isOpen) return;

    const initialize = async () => {
      resetAll();
      if (initialOutput) {
        hydrateFromInitialOutput(initialOutput);
      }
    };

    void initialize();
  }, [isOpen, initialOutput]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== 'INCOME') return;

    const ledgerCode = income.ledgerCode;
    if (!ledgerCode) {
      const clearIncomeAllocation = async () => {
        setIncome((prev) => ({ ...prev, triggerAllocation: false, allocationItems: [] }));
      };

      void clearIncomeAllocation();
      return;
    }

    let cancelled = false;

    const applyTemplate = async () => {
      const templateItems = (await loadIncomeAllocationTemplate?.(ledgerCode)) ?? null;
      if (cancelled) return;

      const projectIds = new Set(projects.map((project) => project.id));
      const nextItems = (templateItems ?? [])
        .filter((item) => projectIds.has(item.projectId))
        .map((item) => ({
          projectId: item.projectId,
          percentage: item.percentage.toString(),
        }));

      setIncome((prev) => {
        if (prev.ledgerCode !== ledgerCode) return prev;

        return {
          ...prev,
          triggerAllocation: nextItems.length > 0,
          allocationItems: nextItems,
        };
      });
    };

    void applyTemplate();

    return () => {
      cancelled = true;
    };
  }, [activeTab, income.ledgerCode, isOpen, loadIncomeAllocationTemplate, projects]);

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

  return {
    state: {
      activeTab,
      expense,
      income,
      investment,
      financing,
      projectTransfer,
      advanced,
      debtPayment,
    },
    setters: {
      setActiveTab,
      setExpense,
      setIncome,
      setInvestment,
      setFinancing,
      setProjectTransfer,
      setAdvanced,
      setDebtPayment,
    },
    derived: {
      preview,
      previewDetails,
    },
    actions: {
      resetAll,
    },
  };
};
