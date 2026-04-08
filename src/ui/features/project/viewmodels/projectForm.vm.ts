import { z } from 'zod';

import { type ProjectCreate } from '@/domains/project/schemas';
import {
  ProjectCategory,
  type ProjectCategory as ProjectCategoryType,
} from '@/domains/project/types/categories';

export const ProjectFormSchema = z.object({
  name: z.string().min(1, '專案名稱不能為空'),
  color: z.string().min(1, '請選擇顏色'),
  icon: z.string().min(1, '請選擇圖示'),
  order: z.number().int().min(0, '排序不能小於 0'),
  description: z.string().optional(),
  category: z.nativeEnum(ProjectCategory),
  isActive: z.boolean(),
});

export type ProjectFormVM = z.infer<typeof ProjectFormSchema>;

export const createDefaultProjectFormVM = (): ProjectFormVM => ({
  name: '',
  color: '#3B82F6',
  icon: '📊',
  order: 0,
  description: '',
  category: ProjectCategory.OPERATING,
  isActive: true,
});

export const mapProjectToFormVM = (project: {
  name: string;
  color: string;
  icon: string;
  order: number;
  description?: string;
  category: ProjectCategoryType;
  isActive: boolean;
}): ProjectFormVM => {
  return {
    name: project.name,
    color: project.color,
    icon: project.icon,
    order: project.order,
    description: project.description || '',
    category: project.category,
    isActive: project.isActive,
  };
};

export const parseProjectFormVM = (input: unknown): ProjectFormVM => {
  return ProjectFormSchema.parse(input);
};

export const mapProjectVMToDomain = (vm: ProjectFormVM): ProjectCreate => {
  return {
    name: vm.name,
    color: vm.color,
    icon: vm.icon,
    order: vm.order,
    description: vm.description || '',
    category: vm.category,
    isActive: vm.isActive,
  };
};
