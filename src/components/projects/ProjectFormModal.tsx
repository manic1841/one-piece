import React, { useState, useEffect } from 'react';
import { type Project } from '../../schemas';
import { ProjectCategory } from '@/domains/project/projectCategory';
import { ICON_OPTIONS, CATEGORY_LABELS } from '../../constants/project/projectLabel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AccountingSettings from './accounting/AccountingSettings';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Partial<Project>) => Promise<void>;
  initialData?: Partial<Project> | null;
  title?: string;
}

const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  title,
}) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    category: ProjectCategory.OPERATING as ProjectCategory,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        category: ProjectCategory.OPERATING as ProjectCategory,
        ...initialData,
      });
    }
  }, [isOpen, initialData]);

  const handleAccountingChange = (data: Partial<Project>) => {
    setFormData((prev) => ({
      ...prev,
      accounting: {
        enabled: prev.accounting?.enabled ?? false,
        ...prev.accounting,
        ...data.accounting,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  const accountingEnabled = formData.accounting?.enabled || false;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title || (initialData?.id ? 'Edit Project' : 'New Project')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">基本資訊</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-name">名稱 *</Label>
                <Input
                  id="project-name"
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="例如：生活費、房租"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-category">專案類別 *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, category: value as ProjectCategory }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger id="project-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project-icon">圖示</Label>
                <Input
                  id="project-icon"
                  type="text"
                  value={formData.icon || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                  placeholder="🛒"
                  disabled={loading}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" type="button" className="w-full">
                      選擇圖示
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="grid grid-cols-8 gap-2">
                      {ICON_OPTIONS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          className="text-2xl hover:bg-accent p-2 rounded transition-colors"
                          onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-color">顏色</Label>
                <Input
                  id="project-color"
                  type="text"
                  value={formData.color || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                  placeholder="#3B82F6"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">說明</Label>
              <textarea
                id="project-description"
                value={formData.description || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={2}
                disabled={loading}
              />
            </div>
          </div>

          {/* Accounting Configuration */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="accounting-enabled"
                checked={accountingEnabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    accounting: {
                      ...(prev.accounting || {}),
                      enabled: checked === true,
                    } as typeof prev.accounting,
                  }))
                }
                disabled={loading}
              />
              <Label htmlFor="accounting-enabled" className="text-sm font-semibold cursor-pointer">
                啟用會計設定
              </Label>
            </div>

            {accountingEnabled && (
              <AccountingSettings data={formData} onChanged={handleAccountingChange} />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={loading} type="button">
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '儲存中...' : '儲存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectFormModal;
