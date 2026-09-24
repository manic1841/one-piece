import { useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { onboardUserUseCase } from '@/application/household/use_cases/onboardUserUseCase';
import { useAuthState } from '@/ui/contexts/useAuthState';

export const useOnboarding = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { user, userProfile, isAdmin, logout, refreshProfile } = useAuthState();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email || !userProfile) return;

    if (!input.trim()) {
      setError('Please enter a household name or ID');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onboardUserUseCase.execute({
        input,
        userProfile,
        userEmail: user.email,
        isAdmin: !!isAdmin,
      });

      // Refresh auth context to get updated householdId
      if (refreshProfile) {
        await refreshProfile();
      }

      navigate('/');
    } catch (err: unknown) {
      console.error(err);
      const error = err as Error;
      setError(error.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return {
    input,
    setInput,
    loading,
    error,
    handleSubmit,
    handleLogout,
  };
};
