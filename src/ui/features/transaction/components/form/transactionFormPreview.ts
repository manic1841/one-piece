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

const getToday = () => new Date().toISOString().slice(0, 10);

const parseAmount = (amount: string) => {
  const parsed = Number.parseFloat(amount);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parsePercentage = (value: string) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const findProjectLabel = (projects: TransactionFormProjectOption[], projectId?: string) => {
  if (!projectId) return '';
  const project = projects.find((item) => item.id === projectId);
  return project ? `${project.icon ? `${project.icon} ` : ''}${project.name}` : '';
};

const findCategoryLabel = (categories: TransactionFormCategoryOption[], ledgerCode?: string) => {
  if (!ledgerCode) return '';
  return categories.find((item) => item.value === ledgerCode)?.label ?? ledgerCode;
};

const previewExpense = (expense: ExpenseFormState): TransactionFormOutput | null => {
  const amount = parseAmount(expense.amount);
  if (!amount || !expense.date || !expense.ledgerCode) return null;

  const allocationItems = expense.allocationItems
    .map((item) => {
      const percentage = parsePercentage(item.percentage);
      if (!percentage) {
        return null;
      }

      return {
        projectId: item.projectId,
        percentage,
      };
    })
    .filter((item): item is { projectId: string; percentage: number } => item !== null);

  const totalPercentage = allocationItems.reduce((sum, item) => sum + item.percentage, 0);

  if (
    expense.triggerAllocation &&
    (allocationItems.length === 0 || Math.abs(totalPercentage - 100) > 0.01)
  ) {
    return null;
  }

  return {
    intentType: 'EXPENSE',
    date: expense.date,
    amount,
    projectId: expense.projectId || undefined,
    ledgerCode: expense.ledgerCode,
    description: expense.description || undefined,
    triggerAllocation: expense.triggerAllocation,
    allocationItems: expense.triggerAllocation ? allocationItems : undefined,
    allocationDirection: expense.triggerAllocation ? 'EXPENSE' : undefined,
  };
};

const previewIncome = (income: IncomeFormState): TransactionFormOutput | null => {
  const amount = parseAmount(income.amount);
  if (!amount || !income.date || !income.ledgerCode) return null;

  const allocationItems = income.allocationItems
    .map((item) => {
      const percentage = parsePercentage(item.percentage);
      if (!percentage) {
        return null;
      }

      return {
        projectId: item.projectId,
        percentage,
      };
    })
    .filter((item): item is { projectId: string; percentage: number } => item !== null);

  const totalPercentage = allocationItems.reduce((sum, item) => sum + item.percentage, 0);

  if (
    income.triggerAllocation &&
    (allocationItems.length === 0 || Math.abs(totalPercentage - 100) > 0.01)
  ) {
    return null;
  }

  return {
    intentType: 'INCOME',
    date: income.date,
    amount,
    ledgerCode: income.ledgerCode,
    description: income.description || undefined,
    triggerAllocation: income.triggerAllocation,
    allocationItems: income.triggerAllocation ? allocationItems : undefined,
    allocationDirection: income.triggerAllocation ? 'INCOME' : undefined,
  };
};

const previewCategory = (
  intentType: 'INVESTMENT' | 'FINANCING',
  state: InvestmentFormState | FinancingFormState,
): TransactionFormOutput | null => {
  const amount = parseAmount(state.amount);
  if (!amount || !state.date || !state.ledgerCode) return null;

  return {
    intentType,
    date: state.date,
    amount,
    ledgerCode: state.ledgerCode,
    description: state.description || undefined,
  };
};

const previewProjectTransfer = (
  projectTransfer: ProjectTransferFormState,
): TransactionFormOutput | null => {
  const amount = parseAmount(projectTransfer.amount);
  if (
    !amount ||
    !projectTransfer.fromProjectId ||
    !projectTransfer.toProjectId ||
    projectTransfer.fromProjectId === projectTransfer.toProjectId
  ) {
    return null;
  }

  return {
    intentType: 'PROJECT_TRANSFER',
    date: getToday(),
    amount,
    fromProjectId: projectTransfer.fromProjectId,
    toProjectId: projectTransfer.toProjectId,
    description: projectTransfer.description || undefined,
  };
};

const previewAdvanced = (advanced: AdvancedFormState): TransactionFormOutput | null => {
  const amount = parseAmount(advanced.amount);
  if (!amount || !advanced.date || !advanced.ledgerCode) return null;

  return {
    intentType: advanced.intentType,
    date: advanced.date,
    amount,
    projectId: advanced.projectId || undefined,
    ledgerCode: advanced.ledgerCode,
    description: advanced.description || undefined,
  };
};

export const buildPreview = (input: {
  activeTab: TransactionFormTab;
  expense: ExpenseFormState;
  income: IncomeFormState;
  investment: InvestmentFormState;
  financing: FinancingFormState;
  projectTransfer: ProjectTransferFormState;
  advanced: AdvancedFormState;
}): TransactionFormOutput | null => {
  const { activeTab, expense, income, investment, financing, projectTransfer, advanced } = input;

  if (activeTab === 'EXPENSE') return previewExpense(expense);
  if (activeTab === 'INCOME') return previewIncome(income);
  if (activeTab === 'INVESTMENT') return previewCategory('INVESTMENT', investment);
  if (activeTab === 'FINANCING') return previewCategory('FINANCING', financing);
  if (activeTab === 'PROJECT_TRANSFER') return previewProjectTransfer(projectTransfer);
  if (activeTab === 'ADVANCED') return previewAdvanced(advanced);

  return null;
};

export const buildPreviewDetails = (input: {
  preview: TransactionFormOutput | null;
  projects: TransactionFormProjectOption[];
  expenseCategories: TransactionFormCategoryOption[];
  incomeCategories: TransactionFormCategoryOption[];
  investmentCategories: TransactionFormCategoryOption[];
  financingCategories: TransactionFormCategoryOption[];
  advancedCategories: TransactionFormCategoryOption[];
}) => {
  const {
    preview,
    projects,
    expenseCategories,
    incomeCategories,
    investmentCategories,
    financingCategories,
    advancedCategories,
  } = input;

  if (!preview) return [] as string[];

  if (preview.intentType === 'EXPENSE') {
    return [
      findProjectLabel(projects, preview.projectId),
      findCategoryLabel(expenseCategories, preview.ledgerCode),
      preview.triggerAllocation ? '送出後需分攤' : '直接入帳',
      preview.date,
    ].filter(Boolean);
  }

  if (preview.intentType === 'INCOME') {
    return [
      findCategoryLabel(incomeCategories, preview.ledgerCode),
      preview.triggerAllocation ? '送出後需分配' : '直接入帳',
      preview.date,
    ].filter(Boolean);
  }

  if (preview.intentType === 'INVESTMENT') {
    return [findCategoryLabel(investmentCategories, preview.ledgerCode), preview.date].filter(
      Boolean,
    );
  }

  if (preview.intentType === 'FINANCING') {
    return [findCategoryLabel(financingCategories, preview.ledgerCode), preview.date].filter(
      Boolean,
    );
  }

  if (preview.intentType === 'PROJECT_TRANSFER') {
    return [
      `${findProjectLabel(projects, preview.fromProjectId)} -> ${findProjectLabel(projects, preview.toProjectId)}`,
    ].filter(Boolean);
  }

  return [
    preview.intentType,
    findCategoryLabel(advancedCategories, preview.ledgerCode),
    findProjectLabel(projects, preview.projectId),
    preview.date,
  ].filter(Boolean);
};
