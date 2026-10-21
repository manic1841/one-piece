import { z } from 'zod';

/** Save dialogs only collect a name; trimming and the empty check are the schema's job. */
export function createSaveNameFormSchema(requiredMessage: string) {
  return z.object({ name: z.string().trim().min(1, requiredMessage) });
}

export type SaveNameVM = z.infer<ReturnType<typeof createSaveNameFormSchema>>;

export const EMPTY_SAVE_NAME_VM: SaveNameVM = { name: '' };

export function mapSaveNameVMToName(vm: SaveNameVM): string {
  return vm.name;
}
