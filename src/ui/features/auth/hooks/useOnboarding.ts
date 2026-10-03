import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { onboardUserUseCase } from '@/application/household/use_cases/onboardUserUseCase';
import { useAuthState } from '@/ui/contexts/useAuthState';

import {
  OnboardingFormSchema,
  type OnboardingFormVM,
  createDefaultOnboardingFormVM,
} from '../viewmodels/onboardingForm.vm';

export const useOnboarding = () => {
  const { user, userProfile, isAdmin, logout, refreshProfile } = useAuthState();
  const navigate = useNavigate();

  const form = useForm<OnboardingFormVM>({
    resolver: zodResolver(OnboardingFormSchema),
    mode: 'onTouched',
    defaultValues: createDefaultOnboardingFormVM(),
  });

  const submit = form.handleSubmit(async (vm) => {
    if (!user || !user.email || !userProfile) return;

    try {
      const parsed = OnboardingFormSchema.parse(vm);
      await onboardUserUseCase.execute({
        input: parsed.input,
        userProfile,
        userEmail: user.email,
        isAdmin: !!isAdmin,
      });

      // Refresh auth context to get updated householdId
      await refreshProfile();

      navigate('/');
    } catch (err) {
      const message =
        err instanceof z.ZodError
          ? err.issues[0]?.message || 'Failed to process request'
          : err instanceof Error
            ? err.message
            : 'Failed to process request';
      form.setError('root', { message });
    }
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return {
    form,
    submit,
    error: form.formState.errors.root?.message ?? null,
    isSubmitting: form.formState.isSubmitting,
    handleLogout,
  };
};
