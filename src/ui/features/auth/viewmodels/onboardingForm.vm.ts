import { z } from 'zod';

export const OnboardingFormSchema = z.object({
  input: z.string().trim().min(1, 'Please enter a household name or ID'),
});

export type OnboardingFormVM = z.output<typeof OnboardingFormSchema>;

export const createDefaultOnboardingFormVM = (): OnboardingFormVM => ({ input: '' });
