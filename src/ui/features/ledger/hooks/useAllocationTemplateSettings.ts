import { useCallback, useEffect, useMemo, useState } from 'react';

import { deleteAllocationTemplateUseCase } from '@/application/ledger/use_cases/deleteAllocationTemplateUseCase';
import { listAllocationTemplatesUseCase } from '@/application/ledger/use_cases/listAllocationTemplatesUseCase';
import { saveAllocationTemplateUseCase } from '@/application/ledger/use_cases/saveAllocationTemplateUseCase';
import { type AllocationTemplate } from '@/domains/allocation/templateSchemas';
import { useAuth } from '@/infra/contexts/useAuth';
import { useProjects } from '@/ui/features/project/hooks/useProjects';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export interface TemplateDraftItem {
  projectId: string;
  percentage: string;
}

export const useAllocationTemplateSettings = () => {
  const { userProfile, currentUser } = useAuth();
  const householdId = userProfile?.householdId ?? '';
  const userEmail = userProfile?.email ?? currentUser?.email ?? '';

  const { projects } = useProjects(householdId);
  const activeProjects = useMemo(() => projects.filter((project) => project.isActive), [projects]);

  const { run, loading, error } = useLoadingTask();

  const [templates, setTemplates] = useState<AllocationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [ledgerCode, setLedgerCode] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [items, setItems] = useState<TemplateDraftItem[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const availableProjects = useMemo(
    () => activeProjects.filter((project) => !items.some((item) => item.projectId === project.id)),
    [activeProjects, items],
  );

  const loadTemplates = useCallback(async (): Promise<AllocationTemplate[]> => {
    if (!householdId) return [];

    const result = await run(() => listAllocationTemplatesUseCase.execute({ householdId }));
    if (result) {
      setTemplates(result);
      return result;
    }

    return [];
  }, [householdId, run]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadTemplates();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTemplates]);

  const resetForm = useCallback(() => {
    setSelectedTemplateId(null);
    setName('');
    setLedgerCode('');
    setIsDefault(false);
    setItems([]);
    setSelectedProjectId('');
  }, []);

  const editTemplate = useCallback(
    (templateId: string) => {
      const template = templates.find((item) => item.id === templateId);
      if (!template) return;

      setSelectedTemplateId(template.id);
      setName(template.name);
      setLedgerCode(template.ledgerCode);
      setIsDefault(template.isDefault);
      setItems(
        template.items.map((item) => ({
          projectId: item.projectId,
          percentage: item.percentage.toString(),
        })),
      );
      setSelectedProjectId('');
    },
    [templates],
  );

  const addProjectItem = useCallback(() => {
    if (!selectedProjectId) return;
    setItems((prev) => [...prev, { projectId: selectedProjectId, percentage: '' }]);
    setSelectedProjectId('');
  }, [selectedProjectId]);

  const updateItemPercentage = useCallback((projectId: string, percentage: string) => {
    setItems((prev) =>
      prev.map((item) => (item.projectId === projectId ? { ...item, percentage } : item)),
    );
  }, []);

  const removeItem = useCallback((projectId: string) => {
    setItems((prev) => prev.filter((item) => item.projectId !== projectId));
  }, []);

  const saveTemplate = useCallback(async () => {
    if (!householdId || !userEmail) return;

    const parsedItems = items
      .map((item) => ({
        projectId: item.projectId,
        percentage: Number.parseFloat(item.percentage),
      }))
      .filter((item) => Number.isFinite(item.percentage) && item.percentage > 0);

    const templateId = await run(() =>
      saveAllocationTemplateUseCase.execute({
        householdId,
        userEmail,
        data: {
          id: selectedTemplateId ?? undefined,
          name,
          ledgerCode,
          isDefault,
          items: parsedItems,
        },
      }),
    );

    if (!templateId) return;

    const latestTemplates = await loadTemplates();
    const latest = latestTemplates.find((template) => template.id === templateId);
    if (!latest) return;

    setSelectedTemplateId(latest.id);
    setName(latest.name);
    setLedgerCode(latest.ledgerCode);
    setIsDefault(latest.isDefault);
    setItems(
      latest.items.map((item) => ({
        projectId: item.projectId,
        percentage: item.percentage.toString(),
      })),
    );
    setSelectedProjectId('');
  }, [
    householdId,
    isDefault,
    items,
    ledgerCode,
    loadTemplates,
    name,
    run,
    selectedTemplateId,
    userEmail,
  ]);

  const deleteTemplate = useCallback(async () => {
    if (!householdId || !selectedTemplateId) return;

    const ok = window.confirm('Delete this allocation template?');
    if (!ok) return;

    await run(() =>
      deleteAllocationTemplateUseCase.execute({
        householdId,
        templateId: selectedTemplateId,
      }),
    );

    resetForm();
    await loadTemplates();
  }, [householdId, loadTemplates, resetForm, run, selectedTemplateId]);

  return {
    loading,
    error: error ?? '',
    templates,
    selectedTemplate,
    activeProjects,
    availableProjects,
    selectedTemplateId,
    name,
    setName,
    ledgerCode,
    setLedgerCode,
    isDefault,
    setIsDefault,
    items,
    selectedProjectId,
    setSelectedProjectId,
    resetForm,
    editTemplate,
    addProjectItem,
    updateItemPercentage,
    removeItem,
    saveTemplate,
    deleteTemplate,
  };
};
