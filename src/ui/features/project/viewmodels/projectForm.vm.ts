import { z } from 'zod';

import { type Project, type ProjectCreate } from '@/domains/project/schemas';

export type { Project };

export const ProjectFormSchema = z.object({
  name: z.string().min(1, '專案名稱不能為空'),
  order: z.number().int().min(0, '排序不能小於 0'),
  isActive: z.boolean(),
});

export type ProjectFormVM = z.infer<typeof ProjectFormSchema>;

export const createDefaultProjectFormVM = (): ProjectFormVM => ({
  name: '',
  order: 0,
  isActive: true,
});

export const mapProjectToFormVM = (project: {
  name: string;
  order: number;
  isActive: boolean;
}): ProjectFormVM => {
  return {
    name: project.name,
    order: project.order,
    isActive: project.isActive,
  };
};

export const parseProjectFormVM = (input: unknown): ProjectFormVM => {
  return ProjectFormSchema.parse(input);
};

export const mapProjectVMToDomain = (vm: ProjectFormVM): ProjectCreate => {
  return {
    name: vm.name,
    order: vm.order,
    isActive: vm.isActive,
  };
};
