import { useEffect, useMemo, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { type z } from 'zod';

import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { buildPreviewDetails } from '@/ui/features/transaction/components/form/transactionFormPreview';
import { type AllocationItemInput } from '@/ui/features/transaction/types/allocation';
import {
  type TransactionFormOutput,
  type TransactionFormProjectOption,
  type TransactionFormTab,
} from '@/ui/features/transaction/types/transaction';
import {
  type TransactionAdvancedFormInput,
  TransactionAdvancedFormSchema,
  type TransactionExpenseFormInput,
  TransactionExpenseFormSchema,
  type TransactionIncomeFormInput,
  TransactionIncomeFormSchema,
  createTransactionAdvancedFormValues,
  createTransactionExpenseFormValues,
  createTransactionIncomeFormValues,
} from '@/ui/features/transaction/viewmodels/transactionForm.vm';

const mapIntentTypeToTab = (
  intentType?: TransactionFormOutput['intentType'] | null,
): TransactionFormTab => {
  if (intentType === 'MANUAL') return 'ADVANCED';
  if (intentType === 'INCOME') return 'INCOME';
  return 'EXPENSE';
};

const parseOutput = (
  schema: z.ZodType<TransactionFormOutput>,
  values: unknown,
): TransactionFormOutput | null => {
  const result = schema.safeParse(values);
  return result.success ? result.data : null;
};

const seedDefaults = (output: TransactionFormOutput | null) => {
  const tab = mapIntentTypeToTab(output?.intentType);

  return {
    tab,
    expense: createTransactionExpenseFormValues(tab === 'EXPENSE' ? output : null),
    income: createTransactionIncomeFormValues(tab === 'INCOME' ? output : null),
    advanced: createTransactionAdvancedFormValues(tab === 'ADVANCED' ? output : null),
  };
};

interface UseTransactionFormStateParams {
  /** The dialog stays mounted between openings so it can animate out. */
  isOpen: boolean;
  initialOutput?: TransactionFormOutput | null;
  onSubmit: (output: TransactionFormOutput) => void | Promise<void>;
  projects: TransactionFormProjectOption[];
  ledgerCodes: LedgerCodeItem[];
  loadIncomeAllocationTemplate?: (ledgerCode: string) => Promise<AllocationItemInput[] | null>;
}

/** One RHF form per tab panel; the tab is hook state, never a form field. */
export const useTransactionFormState = ({
  isOpen,
  initialOutput,
  onSubmit,
  projects,
  ledgerCodes,
  loadIncomeAllocationTemplate,
}: UseTransactionFormStateParams) => {
  // Seed once for the first render; later openings reset from the effect below.
  // Only the tab the edited transaction belongs to is prefilled — the other
  // panels start blank, since a transaction only ever edits through one of them.
  const [defaultValues] = useState(() => seedDefaults(initialOutput ?? null));

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

  const advancedForm = useForm<TransactionAdvancedFormInput, unknown, TransactionFormOutput>({
    resolver: zodResolver(TransactionAdvancedFormSchema),
    mode: 'onTouched',
    defaultValues: defaultValues.advanced,
  });

  // The last template written, so a re-run caused by something other than the
  // code (a project list refresh, a tab switch) does not overwrite an allocation
  // the user has since edited.
  const appliedTemplateRef = useRef<{ code: string; itemsKey: string } | null>(null);

  // The dialog outlives a single opening so it can animate out, so the draft has
  // to be rebuilt on every reopen — otherwise the previous session's values and
  // the previous mode's tab survive.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!isOpen || wasOpen.current) {
      wasOpen.current = isOpen;
      return;
    }
    wasOpen.current = true;

    const seeded = seedDefaults(initialOutput ?? null);
    appliedTemplateRef.current = null;
    setActiveTab(seeded.tab);
    expenseForm.reset(seeded.expense);
    incomeForm.reset(seeded.income);
    advancedForm.reset(seeded.advanced);
    // `initialOutput` is a fresh object per opening and is read only on the
    // open edge; re-running on it while open would discard typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const expenseValues = useWatch({ control: expenseForm.control });
  const incomeValues = useWatch({ control: incomeForm.control });
  const advancedValues = useWatch({ control: advancedForm.control });

  // Derived preview: the active tab's values run through the same schema the
  // resolver uses. It is never stored in RHF.
  const preview = useMemo(() => {
    switch (activeTab) {
      case 'EXPENSE':
        return parseOutput(TransactionExpenseFormSchema, expenseValues);
      case 'INCOME':
        return parseOutput(TransactionIncomeFormSchema, incomeValues);
      case 'ADVANCED':
        return parseOutput(TransactionAdvancedFormSchema, advancedValues);
    }
  }, [activeTab, expenseValues, incomeValues, advancedValues]);

  const previewDetails = useMemo(
    () =>
      buildPreviewDetails({
        preview,
        projects,
        ledgerCodes,
      }),
    [preview, projects, ledgerCodes],
  );

  const incomeLedgerCode = useWatch({ control: incomeForm.control, name: 'ledgerCode' });

  // Selecting an income ledger code pulls its saved allocation template into the
  // draft. The write-back is async, so it is not a synchronous set-state-in-effect.
  useEffect(() => {
    if (activeTab !== 'INCOME') return;

    if (!incomeLedgerCode) {
      appliedTemplateRef.current = null;
      const clearIncomeAllocation = async () => {
        incomeForm.setValue('allocationItems', []);
        incomeForm.setValue('projectId', '');
      };

      void clearIncomeAllocation();
      return;
    }

    const applied = appliedTemplateRef.current;
    if (
      applied?.code === incomeLedgerCode &&
      JSON.stringify(incomeForm.getValues('allocationItems')) !== applied.itemsKey
    ) {
      return;
    }

    let cancelled = false;

    const applyTemplate = async () => {
      const templateItemsRaw = (await loadIncomeAllocationTemplate?.(incomeLedgerCode)) ?? null;
      if (cancelled) return;
      if (incomeForm.getValues('ledgerCode') !== incomeLedgerCode) return;

      const projectIds = new Set(projects.map((project) => project.id));
      const templateItems = (templateItemsRaw ?? [])
        .filter((item) => projectIds.has(item.projectId))
        .map((item) => ({
          projectId: item.projectId,
          percentage: item.percentage.toString(),
        }));

      // One project is the same decision as a direct link, so it is normalized
      // here too; only two or more stay a split.
      const nextItems = templateItems.length === 1 ? [] : templateItems;

      appliedTemplateRef.current = {
        code: incomeLedgerCode,
        itemsKey: JSON.stringify(nextItems),
      };
      incomeForm.setValue('allocationItems', nextItems);
      if (templateItems.length === 1) {
        incomeForm.setValue('projectId', templateItems[0]?.projectId ?? '');
      } else {
        // No template (or an emptied one) must not keep the previous category's
        // project; a split and a direct link stay mutually exclusive.
        incomeForm.setValue('projectId', '');
      }
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
      ADVANCED: advancedForm.handleSubmit(() =>
        onSubmit(TransactionAdvancedFormSchema.parse(advancedForm.getValues())),
      ),
    }),
    [advancedForm, expenseForm, incomeForm, onSubmit],
  );

  const submit = () => {
    void submitByTab[activeTab]();
  };

  return {
    activeTab,
    setActiveTab,
    expenseForm,
    incomeForm,
    advancedForm,
    preview,
    previewDetails,
    submit,
  };
};
