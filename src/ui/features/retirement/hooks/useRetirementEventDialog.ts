import { useEffect, useState } from 'react';

import type { RetirementOneTimeEvent } from '@/domains/retirement/types';
import {
  RetirementEventFormVMSchema,
  buildRetirementEventFormVM,
  mapRetirementEventVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';

interface UseRetirementEventDialogOptions {
  initialData?: RetirementOneTimeEvent;
  currentYear: number;
  onSave: (event: Omit<RetirementOneTimeEvent, 'id'>) => Promise<void>;
}

export function useRetirementEventDialog({
  initialData,
  currentYear,
  onSave,
}: UseRetirementEventDialogOptions) {
  const [isOpen, setIsOpen] = useState(false);

  // Initialize with mapper
  const initialForm = buildRetirementEventFormVM(initialData, currentYear);

  const [name, setName] = useState(initialForm.name);
  const [year, setYear] = useState(initialForm.year);
  const [type, setType] = useState<'income' | 'expense'>(initialForm.type);
  const [amount, setAmount] = useState(initialForm.amount);
  const [note, setNote] = useState(initialForm.note || '');
  const [loading, setLoading] = useState(false);

  // Sync state when initialData changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      const form = buildRetirementEventFormVM(initialData, currentYear);
      setName(form.name);
      setYear(form.year);
      setType(form.type);
      setAmount(form.amount);
      setNote(form.note || '');
    }
  }, [isOpen, initialData, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !year || !amount) {
      return;
    }

    setLoading(true);
    try {
      const vm = RetirementEventFormVMSchema.parse({
        name,
        year,
        type,
        amount,
        note,
      });
      const domainData = mapRetirementEventVMToDomain(vm);
      await onSave(domainData);

      if (!initialData) {
        // Reset form if it's a new entry
        const resetForm = buildRetirementEventFormVM(undefined, currentYear);
        setName(resetForm.name);
        setYear(resetForm.year);
        setType(resetForm.type);
        setAmount(resetForm.amount);
        setNote(resetForm.note || '');
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    isOpen,
    setIsOpen,
    name,
    setName,
    year,
    setYear,
    type,
    setType,
    amount,
    setAmount,
    note,
    setNote,
    loading,
    handleSubmit,
  };
}
