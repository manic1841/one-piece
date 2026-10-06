import { z } from 'zod';

/** Pragmatic email shape shared by the setting add-forms (matches prior behaviour). */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A trimmed, required email string field with a caller-supplied message pair. */
export const emailField = (requiredMessage: string, invalidMessage: string) =>
  z.string().trim().min(1, requiredMessage).regex(EMAIL_PATTERN, invalidMessage);
