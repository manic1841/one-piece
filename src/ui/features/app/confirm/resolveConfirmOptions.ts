export interface ConfirmOptions {
  title: string;
  context?: string;
  consequence?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export const DEFAULT_CONFIRM_LABEL = 'DELETE';
export const DEFAULT_CANCEL_LABEL = 'Cancel';

const DEFAULT_CONSEQUENCE = 'This action cannot be undone.';

export const resolveConfirmOptions = (input: ConfirmOptions | string): ConfirmOptions => {
  if (typeof input === 'string') {
    return {
      title: input,
      consequence: DEFAULT_CONSEQUENCE,
      confirmLabel: DEFAULT_CONFIRM_LABEL,
      cancelLabel: DEFAULT_CANCEL_LABEL,
    };
  }

  return {
    title: input.title,
    context: input.context,
    consequence: input.consequence ?? DEFAULT_CONSEQUENCE,
    confirmLabel: input.confirmLabel ?? DEFAULT_CONFIRM_LABEL,
    cancelLabel: input.cancelLabel ?? DEFAULT_CANCEL_LABEL,
  };
};
