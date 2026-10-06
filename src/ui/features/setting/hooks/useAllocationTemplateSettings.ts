import { useCallback, useEffect, useMemo, useState } from 'react';

import { deleteAllocationTemplateUseCase } from '@/application/ledger/use_cases/deleteAllocationTemplateUseCase';
import { listAllocationTemplatesUseCase } from '@/application/ledger/use_cases/listAllocationTemplatesUseCase';
import { type AllocationTemplate } from '@/domains/allocation/templateSchemas';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useProjects } from '@/ui/features/project/hooks/useProjects';
import { useAllocationTemplateForm } from '@/ui/features/setting/hooks/useAllocationTemplateForm';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export const useAllocationTemplateSettings = () => {
  const { userProfile, user } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const userEmail = userProfile?.email ?? user?.email ?? '';

  const { projects } = useProjects(householdId);
  const activeProjects = useMemo(() => projects.filter((project) => project.isActive), [projects]);

  const { run, loading, errorMessage } = useLoadingTask();

  const [templates, setTemplates] = useState<AllocationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // 表單狀態（含 items repeater）由專屬 Controller hook 擁有；本 hook 只留列表、
  // 選取與 picker 等非表單職責（ADR-0064、§4）。
  const allocationForm = useAllocationTemplateForm({
    householdId,
    userEmail,
    selectedTemplateId,
  });
  const { fields, reset: resetAllocationForm, appendItem, submit } = allocationForm;

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const availableProjects = useMemo(
    () => activeProjects.filter((project) => !fields.some((item) => item.projectId === project.id)),
    [activeProjects, fields],
  );

  const loadTemplates = useCallback(async (): Promise<AllocationTemplate[]> => {
    if (!householdId) return [];

    const result = await run(() => listAllocationTemplatesUseCase.execute({ householdId }));
    if (!result.ok) return [];

    setTemplates(result.value);
    return result.value;
  }, [householdId, run]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTemplates();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTemplates]);

  const resetForm = useCallback(() => {
    setSelectedTemplateId(null);
    setSelectedProjectId('');
    resetAllocationForm();
  }, [resetAllocationForm]);

  const editTemplate = useCallback(
    (templateId: string) => {
      const template = templates.find((item) => item.id === templateId);
      if (!template) return;

      setSelectedTemplateId(template.id);
      setSelectedProjectId('');
      resetAllocationForm(template);
    },
    [templates, resetAllocationForm],
  );

  const addProjectItem = useCallback(() => {
    if (!selectedProjectId) return;
    appendItem(selectedProjectId);
    setSelectedProjectId('');
  }, [appendItem, selectedProjectId]);

  const saveTemplate = useCallback(async () => {
    const savedId = await submit();
    if (!savedId) return;

    const latestTemplates = await loadTemplates();
    const latest = latestTemplates.find((template) => template.id === savedId);
    if (!latest) return;

    setSelectedTemplateId(latest.id);
    setSelectedProjectId('');
    resetAllocationForm(latest);
  }, [loadTemplates, resetAllocationForm, submit]);

  const { confirm } = useConfirm();

  const deleteTemplate = useCallback(async () => {
    if (!householdId || !selectedTemplateId) return;

    const ok = await confirm('Delete this allocation template?');
    if (!ok) return;

    await run(() =>
      deleteAllocationTemplateUseCase.execute({
        householdId,
        templateId: selectedTemplateId,
      }),
    );

    resetForm();
    await loadTemplates();
  }, [householdId, confirm, loadTemplates, resetForm, run, selectedTemplateId]);

  return {
    loading,
    error: errorMessage ?? '',
    templates,
    selectedTemplate,
    activeProjects,
    availableProjects,
    selectedTemplateId,
    selectedProjectId,
    setSelectedProjectId,
    resetForm,
    editTemplate,
    addProjectItem,
    saveTemplate,
    deleteTemplate,
    allocationForm,
  };
};
