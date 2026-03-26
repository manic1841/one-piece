import { useCallback, useEffect, useState } from 'react';

import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { type Project } from '@/domains/project/schemas';
import type { RetirementExpenseCategory } from '@/domains/retirement/types';
import { useAuth } from '@/infra/contexts/useAuth';
import {
  RetirementExpenseFormVMSchema,
  buildRetirementExpenseFormVM,
  mapRetirementExpenseVMToDomain,
} from '@/ui/features/retirement/viewmodels/retirementForm.vm';

import { useRetirementDialogForm } from './useRetirementDialogForm';

interface UseRetirementExpenseDialogOptions {
  initialData?: RetirementExpenseCategory;
  currentYear: number;
  onSave: (expense: Omit<RetirementExpenseCategory, 'id'>) => Promise<void>;
}

export function useRetirementExpenseDialog({
  initialData,
  currentYear,
  onSave,
}: UseRetirementExpenseDialogOptions) {
  const { userProfile } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  // Initialize with mapper
  const initialForm = buildRetirementExpenseFormVM(initialData, currentYear);

  // Base fields from shared hook
  const {
    open,
    setOpen,
    loading,
    setLoading,
    name,
    setName,
    amount,
    setAmount,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,
  } = useRetirementDialogForm({
    initialData,
    currentYear,
    defaultValues: {
      growthRate: initialForm.growthRate,
    },
  });

  // Expense-specific fields
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialForm.sourceProjectId || 'none',
  );
  const [endYear, setEndYear] = useState<string>(initialForm.endYear || '2100');
  const [percentOfSalary, setPercentOfSalary] = useState<number>(initialForm.percentOfSalary || 0);
  const [retirementMultiplier, setRetirementMultiplier] = useState<number>(
    initialForm.retirementMultiplier,
  );

  const loadProjects = useCallback(async () => {
    if (!userProfile?.householdId) return;
    try {
      const allProjects = await listProjectsUseCase.execute({
        householdId: userProfile.householdId,
      });
      setProjects(allProjects.filter((p) => p.isActive));
    } catch (error) {
      console.error('Failed to load projects', error);
    }
  }, [userProfile?.householdId]);

  useEffect(() => {
    if (open && userProfile?.householdId) {
      loadProjects();
    }
  }, [open, userProfile?.householdId, loadProjects]);

  // Sync expense-specific fields when opening
  useEffect(() => {
    if (open) {
      const form = buildRetirementExpenseFormVM(initialData, currentYear);
      setSelectedProjectId(form.sourceProjectId || 'none');
      setEndYear(form.endYear || '');
      setPercentOfSalary(form.percentOfSalary || 0);
      setRetirementMultiplier(form.retirementMultiplier);
    }
  }, [open, initialData, currentYear]);

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);

    if (projectId === 'none') return;

    const project = projects.find((p) => p.id === projectId);
    if (project) {
      if (!name) setName(project.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const vm = RetirementExpenseFormVMSchema.parse({
        name,
        sourceProjectId: selectedProjectId,
        baseAmount: amount,
        growthRate,
        percentOfSalary,
        retirementMultiplier,
        startYear,
        endYear,
      });
      const domainData = mapRetirementExpenseVMToDomain(vm);
      await onSave(domainData);
      setOpen(false);
    } catch (error) {
      console.error('Failed to save expense', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    open,
    setOpen,
    loading,
    name,
    setName,
    amount,
    setAmount,
    growthRate,
    setGrowthRate,
    startYear,
    setStartYear,
    endYear,
    setEndYear,
    selectedProjectId,
    percentOfSalary,
    setPercentOfSalary,
    retirementMultiplier,
    setRetirementMultiplier,
    projects,

    // Handlers
    handleProjectChange,
    handleSubmit,
  };
}
