import React from 'react';

import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { type ProjectFormVM } from '@/ui/features/project/viewmodels/projectForm.vm';

interface ProjectFormFieldsProps {
  formData: ProjectFormVM;
  onChange: (data: Partial<ProjectFormVM>) => void;
  disabled?: boolean;
}

export const ProjectFormFields: React.FC<ProjectFormFieldsProps> = ({
  formData,
  onChange,
  disabled = false,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">基本資料</h3>

      <div className="space-y-2">
        <Label htmlFor="project-name">名稱 *</Label>
        <Input
          id="project-name"
          type="text"
          required
          value={formData.name || ''}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="例如：生活費、房租"
          disabled={disabled}
        />
      </div>
    </div>
  );
};
