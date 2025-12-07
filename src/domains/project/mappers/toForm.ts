import { ProjectCategory, type ProjectFormData } from '@/domains/project/types';
import type { Project } from '@/schemas';

export const toForm = (project?: Project): ProjectFormData => {
  if (!project) {
    return {
      name: '',
      category: ProjectCategory.OPERATING,
      icon: '',
      color: '',
      description: '',
      accounting: {
        enabled: false,
      },
    };
  }

  return {
    name: project.name,
    category: project.category,
    icon: project.icon,
    color: project.color,
    description: project.description || '',
    accounting: {
      enabled: project.accounting?.enabled || false,
    },
  };
};
