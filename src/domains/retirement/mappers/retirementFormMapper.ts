import type {
  RetirementExpenseCategory,
  RetirementIncomeSource,
  RetirementOneTimeEvent,
  RetirementEventFormData,
  RetirementExpenseFormData,
  RetirementIncomeFormData,
} from '../types';

// --- Income ---

export const toRetirementIncomeForm = (
  domain?: RetirementIncomeSource,
  currentYear?: number,
): RetirementIncomeFormData => {
  if (!domain) {
    const startYear = currentYear || new Date().getFullYear();
    return {
      name: '',
      importedFrom: 'manual',
      type: 'salary',
      baseAmount: 0,
      growthRate: 3.0,
      startYear,
      endYear: startYear + 20,
    };
  }

  return {
    name: domain.name,
    importedFrom: domain.importedFrom,
    calculatedFrom: domain.calculatedFrom,
    incomeCategory: domain.incomeCategory,
    type: domain.type,
    baseAmount: domain.baseAmount,
    growthRate: domain.growthRate,
    startYear: domain.startYear,
    endYear: domain.endYear,
    note: domain.note,
  };
};

export const toRetirementIncomeDomain = (
  form: RetirementIncomeFormData,
): Omit<RetirementIncomeSource, 'id'> => {
  return {
    name: form.name,
    importedFrom: form.importedFrom,
    calculatedFrom: form.calculatedFrom,
    incomeCategory: form.incomeCategory,
    type: form.type,
    baseAmount: form.baseAmount,
    growthRate: form.growthRate,
    startYear: form.startYear,
    endYear: form.endYear,
    note: form.note,
  };
};

// --- Expense ---

export const toRetirementExpenseForm = (
  domain?: RetirementExpenseCategory,
  currentYear?: number,
): RetirementExpenseFormData => {
  if (!domain) {
    const startYear = currentYear || new Date().getFullYear();
    return {
      name: '',
      baseAmount: 0,
      growthRate: 2.0,
      retirementMultiplier: 70,
      startYear,
      endYear: '',
      percentOfSalary: 0,
    };
  }

  return {
    name: domain.name,
    sourceProjectId: domain.sourceProjectId,
    baseAmount: domain.baseAmount,
    growthRate: domain.growthRate,
    retirementMultiplier: domain.retirementMultiplier * 100,
    startYear: domain.startYear,
    endYear: domain.endYear?.toString() || '',
    percentOfSalary: domain.percentOfSalary || 0,
    note: domain.note,
  };
};

export const toRetirementExpenseDomain = (
  form: RetirementExpenseFormData,
): Omit<RetirementExpenseCategory, 'id'> => {
  return {
    name: form.name,
    sourceProjectId: form.sourceProjectId === 'none' ? undefined : form.sourceProjectId,
    baseAmount: form.baseAmount,
    growthRate: form.growthRate,
    retirementMultiplier: form.retirementMultiplier / 100,
    startYear: form.startYear,
    endYear: form.endYear ? parseInt(form.endYear) : null,
    percentOfSalary:
      form.percentOfSalary && form.percentOfSalary > 0 ? form.percentOfSalary : undefined,
    note: form.note,
  };
};

// --- Event ---

export const toRetirementEventForm = (
  domain?: RetirementOneTimeEvent,
  currentYear?: number,
): RetirementEventFormData => {
  if (!domain) {
    return {
      name: '',
      year: (currentYear || new Date().getFullYear()).toString(),
      type: 'expense',
      amount: '',
      note: '',
    };
  }

  return {
    name: domain.name,
    year: domain.year.toString(),
    type: domain.type,
    amount: domain.amount.toString(),
    note: domain.note || '',
  };
};

export const toRetirementEventDomain = (
  form: RetirementEventFormData,
): Omit<RetirementOneTimeEvent, 'id'> => {
  return {
    name: form.name,
    year: parseInt(form.year),
    type: form.type,
    amount: parseFloat(form.amount),
    note: form.note || undefined,
  };
};
