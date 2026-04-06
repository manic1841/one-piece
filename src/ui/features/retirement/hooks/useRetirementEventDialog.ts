import { useEffect, useState } from 'react';

import { CalculationMode } from '@/domains/retirement/types';
import type { RetirementOneTimeEvent } from '@/domains/retirement/types';
import {
  type RetirementEventFormVM,
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
  const [type, setType] = useState<'income' | 'expense'>(initialForm.type);
  const [phases, setPhases] = useState<RetirementEventFormVM['phases']>(initialForm.phases);
  const [note, setNote] = useState(initialForm.note || '');
  const [loading, setLoading] = useState(false);

  // Sync state when initialData changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      const form = buildRetirementEventFormVM(initialData, currentYear);
      setName(form.name);
      setType(form.type);
      setPhases(form.phases);
      setNote(form.note || '');
    }
  }, [isOpen, initialData, currentYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || phases.length === 0) {
      return;
    }

    setLoading(true);
    try {
      const vm = RetirementEventFormVMSchema.parse({
        name,
        type,
        phases,
        note,
      });
      const domainData = mapRetirementEventVMToDomain(vm);
      await onSave(domainData);

      if (!initialData) {
        // Reset form if it's a new entry
        const resetForm = buildRetirementEventFormVM(undefined, currentYear);
        setName(resetForm.name);
        setType(resetForm.type);
        setPhases(resetForm.phases);
        setNote(resetForm.note || '');
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save event:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhase = () => {
    setPhases((prev) => [
      ...prev,
      {
        name: `Phase ${prev.length + 1}`,
        startYear: String(currentYear),
        endYear: String(currentYear),
        mode: CalculationMode.FIXED,
        amount: '',
        growthRate: '0',
        percentage: '0',
        linkedIncomeId: '',
      },
    ]);
  };

  const handleRemovePhase = (index: number) => {
    setPhases((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePhase = (
    index: number,
    updates: Partial<RetirementEventFormVM['phases'][number]>,
  ) => {
    setPhases((prev) => prev.map((phase, i) => (i === index ? { ...phase, ...updates } : phase)));
  };

  return {
    isOpen,
    setIsOpen,
    name,
    setName,
    type,
    setType,
    phases,
    handleAddPhase,
    handleRemovePhase,
    handleUpdatePhase,
    note,
    setNote,
    loading,
    handleSubmit,
  };
}
