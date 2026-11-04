/**
 * Result shape shared by the retirement form VMs. `ok` narrows `data`; the
 * error map stays caller-shaped so each form can key it the way its fields are
 * rendered.
 */
export interface ValidationOutcome<T, E = Partial<Record<string, string>>> {
  ok: boolean;
  data?: T;
  errors: E;
}
