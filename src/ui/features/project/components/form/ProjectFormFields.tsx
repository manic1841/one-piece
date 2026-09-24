import React from 'react';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  TextInput,
} from '@/ui/components/form';

/**
 * The project form body. Reads its binding from the surrounding `<Form>`
 * context (see `useProjectForm`), so it takes no props of its own.
 */
export const ProjectFormFields: React.FC = () => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">基本資料</h3>

      <FormField name="name">
        <FormItem>
          <FormLabel required>名稱</FormLabel>
          <FormControl>
            <TextInput placeholder="例如：生活費、房租" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  );
};
