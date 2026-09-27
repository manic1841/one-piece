import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { type z } from 'zod';

import { buildPreviewDetails } from '@/ui/features/transaction/components/form/transactionFormPreview';
import { type AllocationItemInput } from '@/ui/features/transaction/types/allocation';
import {
  type TransactionFormCategoryOption,
  type TransactionFormOutput,
  type TransactionFormProjectOption,
  type TransactionFormTab,
} from '@/ui/features/transaction/types/transaction';
import {
  type TransactionAdvancedFormInput,
  TransactionAdvancedFormSchema,
  type TransactionExpenseFormInput,
  TransactionExpenseFormSchema,
  type TransactionFinancingFormInput,
  TransactionFinancingFormSchema,
  type TransactionIncomeFormInput,
  TransactionIncomeFormSchema,
  type TransactionInvestmentFormInput,
  TransactionInvestmentFormSchema,
  createTransactionAdvancedFormValues,
  createTransactionExpenseFormValues,
  createTransactionFinancingFormValues,
  createTransactionIncomeFormValues,
  createTransactionInvestmentFormValues,
} from '@/ui/features/transaction/viewmodels/transactionForm.vm';

const mapIntentTypeToTab = (
  intentType?: TransactionFormOutput['intentType'] | null,
): TransactionFormTab => {
  if (intentType === 'MANUAL') return 'ADVANCED';
  if (intentType === 'INCOME' || intentType === 'INVESTMENT' || intentType === 'FINANCING') {
    return intentType;
  }
  return 'EXPENSE';
};

const parseOutput = (
  schema: z.ZodType<TransactionFormOutput>,
  values: unknown,
): TransactionFormOutput | null => {
  const result = schema.safeParse(values);
  return result.success ? result.data : null;
};

interface UseTransactionFormStateParams {
  initialOutput?: TransactionFormOutput | null;
  onSubmit: (output: TransactionFormOutput) => void | Promise<void>;
  projects: TransactionFormProjectOption[];
  expenseCategories: TransactionFormCategoryOption[];
  incomeCategories: TransactionFormCategoryOption[];
  investmentCategories: TransactionFormCategoryOption[];
  financingCategories: TransactionFormCategoryOption[];
  advancedCategories: TransactionFormCategoryOption[];
  loadIncomeAllocationTemplate?: (ledgerCode: string) => Promise<AllocationItemInput[] | null>;
}

/**
 * Controller for the transaction dialog.
 *
 * The dialog composes one transaction across five tab panels, so there is one
 * RHF form per panel — never one giant form for every tab. The selected tab is
 * hook state, not a form field. Each form's schema coerces the string field
 * values into the numeric `TransactionFormOutput`, which is handed to
 * `onSubmit`; the numeric VM parse inside `useTransactionForm` stays the
 * authoritative gate.
 */
export const useTransactionFormState = ({
  initialOutput,
  onSubmit,
  projects,
  expenseCategories,
  incomeCategories,
  investmentCategories,
  financingCategories,
  advancedCategories,
  loadIncomeAllocationTemplate,
}: UseTransactionFormStateParams) => {
  // The dialog is mounted on open, so defaults are seeded once from the edited
  // transaction; there is no reset-on-open effect. Only the tab that the edited
  // transaction belongs to is prefilled — the other panels start blank, since a
  // transaction only ever edits through one of them.
  const [defaultValues] = useState(() => {
    const output = initialOutput ?? null;
    const tab = mapIntentTypeToTab(output?.intentType);

    return {
      expense: createTransactionExpenseFormValues(tab === 'EXPENSE' ? output : null),
      income: createTransactionIncomeFormValues(tab === 'INCOME' ? output : null),
      investment: createTransactionInvestmentFormValues(tab === 'INVESTMENT' ? output : null),
      financing: createTransactionFinancingFormValues(tab === 'FINANCING' ? output : null),
      advanced: createTransactionAdvancedFormValues(tab === 'ADVANCED' ? output : null),
    };
  });

  const [activeTab, setActiveTab] = useState<TransactionFormTab>(() =>
    mapIntentTypeToTab(initialOutput?.intentType),
  );

  const expenseForm = useForm<TransactionExpenseFormInput, unknown, TransactionFormOutput>({
    resolver: zodResolver(TransactionExpenseFormSchema),
    mode: 'onTouched',
    defaultValues: defaultValues.expense,
  });

  const incomeForm = useForm<TransactionIncomeFormInput, unknown, TransactionFormOutput>({
    resolver: zodResolver(TransactionIncomeFormSchema),
    mode: 'onTouched',
    defaultValues: defaultValues.income,
  });

  const investmentForm = useForm<TransactionInvestmentFormInput, unknown, TransactionFormOutput>({
    resolver: zodResolver(TransactionInvestmentFormSchema),
    mode: 'onTouched',
    defaultValues: defaultValues.investment,
  });

  const financingForm = useForm<TransactionFinancingFormInput, unknown, TransactionFormOutput>({
    resolver: zodResolver(TransactionFinancingFormSchema),
    mode: 'onTouched',
    defaultValues: defaultValues.financing,
  });

  const advancedForm = useForm<TransactionAdvancedFormInput, unknown, TransactionFormOutput>({
    resolver: zodResolver(TransactionAdvancedFormSchema),
    mode: 'onTouched',
    defaultValues: defaultValues.advanced,
  });

  const expenseValues = useWatch({ control: expenseForm.control });
  const incomeValues = useWatch({ control: incomeForm.control });
  const investmentValues = useWatch({ control: investmentForm.control });
  const financingValues = useWatch({ control: financingForm.control });
  const advancedValues = useWatch({ control: advancedForm.control });

  // Derived preview: the active tab's values run through the same schema the
  // resolver uses. It is never stored in RHF.
  const preview = useMemo(() => {
    switch (activeTab) {
      case 'EXPENSE':
        return parseOutput(TransactionExpenseFormSchema, expenseValues);
      case 'INCOME':
        return parseOutput(TransactionIncomeFormSchema, incomeValues);
      case 'INVESTMENT':
        return parseOutput(TransactionInvestmentFormSchema, investmentValues);
      case 'FINANCING':
        return parseOutput(TransactionFinancingFormSchema, financingValues);
      case 'ADVANCED':
        return parseOutput(TransactionAdvancedFormSchema, advancedValues);
    }
  }, [activeTab, expenseValues, incomeValues, investmentValues, financingValues, advancedValues]);

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

  const incomeLedgerCode = useWatch({ control: incomeForm.control, name: 'ledgerCode' });

  // Selecting an income ledger code pulls its saved allocation template into the
  // draft. The write-back is async, so it is not a synchronous set-state-in-effect.
  useEffect(() => {
    if (activeTab !== 'INCOME') return;

    if (!incomeLedgerCode) {
      const clearIncomeAllocation = async () => {
        incomeForm.setValue('triggerAllocation', false);
        incomeForm.setValue('allocationItems', []);
      };

      void clearIncomeAllocation();
      return;
    }

    let cancelled = false;

    const applyTemplate = async () => {
      const templateItems = (await loadIncomeAllocationTemplate?.(incomeLedgerCode)) ?? null;
      if (cancelled) return;
      if (incomeForm.getValues('ledgerCode') !== incomeLedgerCode) return;

      const projectIds = new Set(projects.map((project) => project.id));
      const nextItems = (templateItems ?? [])
        .filter((item) => projectIds.has(item.projectId))
        .map((item) => ({
          projectId: item.projectId,
          percentage: item.percentage.toString(),
        }));

      incomeForm.setValue('triggerAllocation', nextItems.length > 0);
      incomeForm.setValue('allocationItems', nextItems);
    };

    void applyTemplate();

    return () => {
      cancelled = true;
    };
  }, [activeTab, incomeForm, incomeLedgerCode, loadIncomeAllocationTemplate, projects]);

  // Each panel submits through its own form; the explicit schema parse inside is
  // the tab-level gate before the numeric VM gate runs.
  const submitByTab: Record<TransactionFormTab, () => Promise<void>> = useMemo(
    () => ({
      EXPENSE: expenseForm.handleSubmit(() =>
        onSubmit(TransactionExpenseFormSchema.parse(expenseForm.getValues())),
      ),
      INCOME: incomeForm.handleSubmit(() =>
        onSubmit(TransactionIncomeFormSchema.parse(incomeForm.getValues())),
      ),
      INVESTMENT: investmentForm.handleSubmit(() =>
        onSubmit(TransactionInvestmentFormSchema.parse(investmentForm.getValues())),
      ),
      FINANCING: financingForm.handleSubmit(() =>
        onSubmit(TransactionFinancingFormSchema.parse(financingForm.getValues())),
      ),
      ADVANCED: advancedForm.handleSubmit(() =>
        onSubmit(TransactionAdvancedFormSchema.parse(advancedForm.getValues())),
      ),
    }),
    [advancedForm, expenseForm, financingForm, incomeForm, investmentForm, onSubmit],
  );

  const submit = () => {
    void submitByTab[activeTab]();
  };

  return {
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
  };
};
