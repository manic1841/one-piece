import React, { useState, useEffect } from 'react';
import { type Project } from '../../schemas';
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
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        includeInReconciliation: true,
        ...initialData,
      });
    }
  }, [isOpen, initialData]);

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title || (initialData?.id ? 'Edit Project' : 'New Project')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Groceries"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-icon">Icon (Emoji)</Label>
            <Input
              id="project-icon"
              type="text"
              value={formData.icon || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
              placeholder="e.g., 🛒"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-color">Color Class</Label>
            <Input
              id="project-color"
              type="text"
              value={formData.color || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
              placeholder="e.g., bg-blue-100 text-blue-700"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Tailwind CSS classes for background and text color
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <textarea
              id="project-description"
              value={formData.description || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* Include in Reconciliation */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-reconciliation"
              checked={formData.includeInReconciliation ?? true}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, includeInReconciliation: checked === true }))
              }
              disabled={loading}
            />
            <Label
              htmlFor="include-reconciliation"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include in reconciliation
            </Label>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectFormModal;
