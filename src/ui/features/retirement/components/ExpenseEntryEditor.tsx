import type { RetirementExpenseCategory } from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementExpenseEditor } from '../hooks/useRetirementExpenseEditor';
import { RetirementEntryEditor } from './RetirementEntryEditor';

interface ExpenseEntryEditorProps {
  onSave: (expense: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
  currentYear: number;
  birthYear: number;
  retirementAge: number;
  planInflationRate: number;
  initialData?: RetirementExpenseCategory;
  trigger?: React.ReactNode;
}

/** 支出列的側邊編輯器：接上 expense controller（ADR-0064）後交給共用編輯器渲染。 */
export function ExpenseEntryEditor({
  onSave,
  currentYear,
  birthYear,
  retirementAge,
  planInflationRate,
  initialData,
  trigger,
}: ExpenseEntryEditorProps) {
  const {
    open,
    setOpen,
    loading,
    form,
    isDebtPayment,
    growthText,
    importSourceText,
    submitError,
    handleSubmit,
  } = useRetirementExpenseEditor({
    initialData,
    currentYear,
    birthYear,
    retirementAge,
    planInflationRate,
    onSave,
  });

  return (
    <RetirementEntryEditor
      kind="expense"
      form={form}
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit}
      loading={loading}
      submitError={submitError}
      growthText={growthText}
      planInflationRate={planInflationRate}
      isDebtPayment={isDebtPayment}
      isEdit={Boolean(initialData)}
      importSourceText={importSourceText}
      trigger={trigger}
    />
  );
}
