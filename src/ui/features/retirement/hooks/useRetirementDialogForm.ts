import { useState } from 'react';

interface BaseFormData {
  name: string;
  baseAmount: number;
  growthRate: number;
  startYear: number;
}

interface UseRetirementDialogFormOptions<T extends BaseFormData> {
  initialData?: Partial<T>;
  currentYear: number;
  defaultValues?: Partial<T>;
}

export function useRetirementDialogForm<T extends BaseFormData>({
  initialData,
  currentYear,
  defaultValues = {},
}: UseRetirementDialogFormOptions<T>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Common form fields - initialize with initialData or defaults
  const [name, setName] = useState(initialData?.name || defaultValues.name || '');
  const [amount, setAmount] = useState(initialData?.baseAmount || defaultValues.baseAmount || 0);
  const [growthRate, setGrowthRate] = useState(
    initialData?.growthRate ?? defaultValues.growthRate ?? 2,
  );
  const [startYear, setStartYear] = useState(
    initialData?.startYear || defaultValues.startYear || currentYear,
  );

  const resetForm = () => {
    setName(initialData?.name || defaultValues.name || '');
    setAmount(initialData?.baseAmount || defaultValues.baseAmount || 0);
    setGrowthRate(initialData?.growthRate ?? defaultValues.growthRate ?? 2);
    setStartYear(initialData?.startYear || defaultValues.startYear || currentYear);
  };

  // Wrapper for setOpen that resets form when opening
  const handleSetOpen = (value: boolean) => {
    if (value) {
      resetForm();
    }
    setOpen(value);
  };

  return {
    // Dialog state
    open,
    setOpen: handleSetOpen,
    loading,
    setLoading,

    // Common form fields
    name,
    setName,
    amount,
    setAmount,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,

    // Utilities
    resetForm,
  };
}
