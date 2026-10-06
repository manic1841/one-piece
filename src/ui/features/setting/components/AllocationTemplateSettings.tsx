import { Edit2, Plus, Save, Trash2 } from 'lucide-react';

import { ListSectionHeader } from '@/ui/components/ListSectionHeader';
import {
  FormItem,
  NumberInput,
  SelectField,
  type SelectFieldOption,
  TextInput,
} from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Checkbox } from '@/ui/components/ui/checkbox';
import { Label } from '@/ui/components/ui/label';
import { SettingsAllocationLabels } from '@/ui/constants/setting/settingsLabels';
import { useAllocationTemplateSettings } from '@/ui/features/setting/hooks/useAllocationTemplateSettings';
import { cn } from '@/ui/utils/cn';

/** Accounting 區段內容：收入分配模板。外框由區段頁面提供。 */
export const AllocationTemplateSettings = () => {
  const {
    loading,
    error,
    templates,
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
  } = useAllocationTemplateSettings();

  const totalPercentage = items.reduce(
    (sum, item) => sum + (Number.parseFloat(item.percentage) || 0),
    0,
  );

  const projectOptions: SelectFieldOption[] = availableProjects.map((project) => ({
    value: project.id,
    label: project.name,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
      <div className="space-y-4">
        <ListSectionHeader
          title={
            selectedTemplateId
              ? SettingsAllocationLabels.formTitleEdit
              : SettingsAllocationLabels.formTitleCreate
          }
          actions={
            <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
              {SettingsAllocationLabels.newAction}
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormItem>
            <Label htmlFor="allocation-template-name">{SettingsAllocationLabels.nameLabel}</Label>
            <TextInput
              id="allocation-template-name"
              placeholder={SettingsAllocationLabels.namePlaceholder}
              value={name}
              onChange={setName}
            />
          </FormItem>
          <FormItem>
            <Label htmlFor="allocation-template-ledger">
              {SettingsAllocationLabels.ledgerLabel}
            </Label>
            <TextInput
              id="allocation-template-ledger"
              placeholder={SettingsAllocationLabels.ledgerPlaceholder}
              value={ledgerCode}
              onChange={setLedgerCode}
            />
          </FormItem>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Checkbox
            id="allocation-template-default"
            checked={isDefault}
            onCheckedChange={(checked) => setIsDefault(checked === true)}
          />
          <Label htmlFor="allocation-template-default">
            {SettingsAllocationLabels.defaultLabel}
          </Label>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SelectField
              aria-label={SettingsAllocationLabels.projectPlaceholder}
              className="min-w-48"
              value={selectedProjectId}
              onChange={setSelectedProjectId}
              options={projectOptions}
              placeholder={SettingsAllocationLabels.projectPlaceholder}
            />
            <Button
              type="button"
              variant="outline"
              onClick={addProjectItem}
              disabled={!selectedProjectId}
            >
              <Plus size={14} className="mr-1" aria-hidden="true" />
              {SettingsAllocationLabels.addItemAction}
            </Button>
            <span
              className={cn(
                'text-sm font-medium',
                Math.abs(totalPercentage - 100) < 0.01 ? 'text-positive' : 'text-warning',
              )}
            >
              {SettingsAllocationLabels.totalPrefix} {totalPercentage.toFixed(1)}%
            </span>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">{SettingsAllocationLabels.itemsEmpty}</p>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => {
                const project = activeProjects.find((p) => p.id === item.projectId);
                if (!project) return null;

                return (
                  <div key={item.projectId} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1 truncate text-sm font-medium">
                      {project.name}
                    </div>
                    <NumberInput
                      aria-label={`${project.name} ${SettingsAllocationLabels.percentageLabel}`}
                      min="0"
                      step="0.1"
                      className="w-24"
                      value={item.percentage}
                      onChange={(value) => updateItemPercentage(item.projectId, value)}
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={SettingsAllocationLabels.removeItemAction}
                      onClick={() => removeItem(item.projectId)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void saveTemplate()} disabled={loading}>
            <Save size={14} className="mr-1" aria-hidden="true" />
            {SettingsAllocationLabels.saveAction}
          </Button>
          {selectedTemplateId && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => void deleteTemplate()}
              disabled={loading}
            >
              <Trash2 size={14} className="mr-1" aria-hidden="true" />
              {SettingsAllocationLabels.deleteAction}
            </Button>
          )}
          {error && (
            <Alert variant="destructive" className="w-full">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <ListSectionHeader
          title={SettingsAllocationLabels.existingTitle}
          count={templates.length}
        />
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{SettingsAllocationLabels.templatesEmpty}</p>
        ) : (
          <div className="divide-y divide-border">
            {templates.map((template) => (
              <div key={template.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{template.name}</p>
                    {template.isDefault && (
                      <Badge variant="outline">{SettingsAllocationLabels.defaultBadge}</Badge>
                    )}
                  </div>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {template.ledgerCode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {template.items
                      .map((item) => {
                        const project = activeProjects.find((p) => p.id === item.projectId);
                        return `${project?.name ?? item.projectId} ${item.percentage}%`;
                      })
                      .join(' / ')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={SettingsAllocationLabels.editAction}
                  onClick={() => editTemplate(template.id)}
                >
                  <Edit2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
