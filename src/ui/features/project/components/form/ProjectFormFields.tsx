import React from 'react';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  TextInput,
} from '@/ui/components/form';
import { PROJECT_FORM_LABELS } from '@/ui/constants/project/projectFormLabels';

/**
 * The project form body. Reads its binding from the surrounding `<Form>`
 * context (see `useProjectForm`), so it takes no props of its own.
 */
export const ProjectFormFields: React.FC = () => {
  return (
    <div className="space-y-4">
      <FormField name="name">
        <FormItem>
          <FormLabel required>{PROJECT_FORM_LABELS.NAME_LABEL}</FormLabel>
          <FormControl>
            <TextInput placeholder={PROJECT_FORM_LABELS.NAME_PLACEHOLDER} />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  );
};
