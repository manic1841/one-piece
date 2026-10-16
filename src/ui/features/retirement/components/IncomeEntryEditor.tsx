import type { RetirementIncomeSource } from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementIncomeEditor } from '../hooks/useRetirementIncomeEditor';
import { RetirementEntryEditor } from './RetirementEntryEditor';

interface IncomeEntryEditorProps {
  onSave: (income: Omit<RetirementIncomeSource, 'id'>) => Promise<void>;
  currentYear: number;
  birthYear: number;
  retirementAge: number;
  planInflationRate: number;
  initialData?: RetirementIncomeSource;
  trigger?: React.ReactNode;
}

/** 收入列的側邊編輯器：接上 income controller（ADR-0064）後交給共用編輯器渲染。 */
export function IncomeEntryEditor({
  onSave,
  currentYear,
  birthYear,
  retirementAge,
  planInflationRate,
  initialData,
  trigger,
}: IncomeEntryEditorProps) {
  const {
    open,
    setOpen,
    loading,
    form,
    currentAnnual,
    growthText,
    importSourceText,
    submitError,
    handleSubmit,
  } = useRetirementIncomeEditor({
    initialData,
    currentYear,
    birthYear,
    retirementAge,
    planInflationRate,
    onSave,
  });

  return (
    <RetirementEntryEditor
      kind="income"
      form={form}
      open={open}
      setOpen={setOpen}
      onSubmit={handleSubmit}
      loading={loading}
      submitError={submitError}
      growthText={growthText}
      planInflationRate={planInflationRate}
      currentAnnual={currentAnnual}
      isEdit={Boolean(initialData)}
      importSourceText={importSourceText}
      trigger={trigger}
    />
  );
}
