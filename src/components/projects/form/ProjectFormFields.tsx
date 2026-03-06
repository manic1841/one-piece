import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CATEGORY_LABELS, COLOR_OPTIONS, ICON_OPTIONS } from '@/constants/project/projectLabel';
import { ProjectCategory, type ProjectFormData } from '@/domains/project/types';

interface ProjectFormFieldsProps {
  formData: ProjectFormData;
  onChange: (data: Partial<ProjectFormData>) => void;
  disabled?: boolean;
}

export const ProjectFormFields: React.FC<ProjectFormFieldsProps> = ({
  formData,
  onChange,
  disabled = false,
}) => {
  return (
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
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="例如：生活費、房租"
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="project-category">專案類別 *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => onChange({ category: value as ProjectCategory })}
            disabled={disabled}
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
            onChange={(e) => onChange({ icon: e.target.value })}
            placeholder="🛒"
            disabled={disabled}
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
                    onClick={() => onChange({ icon })}
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
          <div className="flex gap-2 items-center">
            <Input
              id="project-color"
              type="text"
              value={formData.color || ''}
              onChange={(e) => onChange({ color: e.target.value })}
              placeholder="#3B82F6"
              disabled={disabled}
              className="font-mono"
            />
            <div
              className="w-10 h-10 rounded border"
              style={{ backgroundColor: formData.color || 'transparent' }}
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" type="button" className="w-full">
                選擇顏色
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid grid-cols-5 gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="w-10 h-10 rounded-full border-2 hover:scale-110 transition-transform flex items-center justify-center p-0 overflow-hidden"
                    style={{
                      backgroundColor: color,
                      borderColor: formData.color === color ? 'white' : 'transparent',
                      boxShadow: formData.color === color ? '0 0 0 2px black' : 'none',
                    }}
                    onClick={() => onChange({ color })}
                    title={color}
                  >
                    {formData.color === color && (
                      <span className="text-white drop-shadow-md">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="project-description">說明</Label>
        <textarea
          id="project-description"
          value={formData.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          rows={2}
          disabled={disabled}
        />
      </div>
    </div>
  );
};
