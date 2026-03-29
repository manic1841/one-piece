import { Edit2, Plus, Save, Trash2 } from 'lucide-react';

import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Checkbox } from '@/ui/components/ui/checkbox';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { useAllocationTemplateSettings } from '@/ui/features/ledger/hooks/useAllocationTemplateSettings';

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income Allocation Templates</CardTitle>
        <CardDescription>
          Manage reusable project allocation ratios for income ledger codes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {selectedTemplateId ? 'Edit Template' : 'Create Template'}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                New
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="allocation-template-name">Template Name</Label>
                <Input
                  id="allocation-template-name"
                  placeholder="e.g. Charles Salary"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allocation-template-ledger">Income LedgerCode</Label>
                <Input
                  id="allocation-template-ledger"
                  placeholder="income:salary:charles"
                  value={ledgerCode}
                  onChange={(event) => setLedgerCode(event.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              Use as default fallback template
            </label>

            <div className="space-y-3 rounded-md border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedProjectId}
                  onChange={(event) => setSelectedProjectId(event.target.value)}
                  className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Select project</option>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.icon ? `${project.icon} ` : ''}
                      {project.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addProjectItem}
                  disabled={!selectedProjectId}
                >
                  <Plus size={14} className="mr-1" /> Add Item
                </Button>
                <span
                  className={`text-xs font-medium ${Math.abs(totalPercentage - 100) < 0.01 ? 'text-emerald-600' : 'text-amber-700'}`}
                >
                  Total {totalPercentage.toFixed(1)}%
                </span>
              </div>

              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No allocation items yet.</p>
                ) : (
                  items.map((item) => {
                    const project = activeProjects.find((p) => p.id === item.projectId);
                    if (!project) return null;

                    return (
                      <div
                        key={item.projectId}
                        className="flex items-center gap-2 rounded-md border p-2"
                      >
                        <div className="min-w-0 flex-1 text-sm font-medium">
                          {project.icon ? `${project.icon} ` : ''}
                          {project.name}
                        </div>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          className="h-8 w-24 text-right"
                          value={item.percentage}
                          onChange={(event) =>
                            updateItemPercentage(item.projectId, event.target.value)
                          }
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeItem(item.projectId)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => void saveTemplate()} disabled={loading}>
                <Save size={14} className="mr-1" /> Save Template
              </Button>
              {selectedTemplateId && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void deleteTemplate()}
                  disabled={loading}
                >
                  Delete
                </Button>
              )}
              {error && <span className="text-sm text-destructive">{error}</span>}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="text-sm font-semibold">Existing Templates</h3>
            <div className="space-y-2">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates yet.</p>
              ) : (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-md border bg-background p-3 transition-colors hover:bg-muted/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{template.name}</p>
                          {template.isDefault && <Badge variant="secondary">default</Badge>}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">
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
                        onClick={() => editTemplate(template.id)}
                      >
                        <Edit2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
