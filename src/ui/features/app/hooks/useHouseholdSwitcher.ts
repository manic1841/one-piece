import { useCallback, useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { getHouseholdsByUserUseCase } from '@/application/household/use_cases/getHouseholdsByUserUseCase';
import { leaveHouseholdUseCase } from '@/application/household/use_cases/leaveHouseholdUseCase';
import { switchHouseholdUseCase } from '@/application/household/use_cases/switchHouseholdUseCase';
import { type Household } from '@/domains/household/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useConfirm } from '@/ui/features/app/confirm/ConfirmDialog';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useHouseholdSwitcher(
  currentHouseholdId: string | undefined,
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
) {
  const { user, refreshProfile } = useAuthState();
  const navigate = useNavigate();
  const [households, setHouseholds] = useState<Household[]>([]);
  const { loading, run } = useLoadingTask();

  const uid = user?.uid;

  const loadHouseholds = useCallback(async () => {
    if (!uid || !isOpen) return;

    const result = await run(async () => getHouseholdsByUserUseCase.execute({ uid }));
    if (!result.ok && result.kind === 'aborted') return;
    if (result.ok) {
      setHouseholds(result.value);
    } else {
      console.error('Error fetching households:', result.error);
    }
  }, [uid, isOpen, run]);

  useEffect(() => {
    // The analyzer cannot see through the awaited write-back in `loadHouseholds`
    // and reports this as a synchronous setState; the write-back lands in a
    // promise continuation, not in the effect body. See issue #186.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHouseholds();
  }, [loadHouseholds]);

  const handleSwitchHousehold = async (householdId: string) => {
    if (!user || householdId === currentHouseholdId) return;

    try {
      await switchHouseholdUseCase.execute({ uid: user.uid, householdId });
      await refreshProfile();
      navigate('/');
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching household:', error);
      alert('Failed to switch household. Please try again.');
    }
  };

  const { confirm } = useConfirm();

  const handleLeaveHousehold = async () => {
    if (!user) return;

    const confirmed = await confirm({
      title: 'Leave this household?',
      consequence: 'You will be returned to onboarding to join or create another household.',
      confirmLabel: 'LEAVE',
    });
    if (confirmed) {
      try {
        await leaveHouseholdUseCase.execute({ uid: user.uid });
        await refreshProfile();
        navigate('/onboarding');
        setIsOpen(false);
      } catch (error) {
        console.error('Error leaving household:', error);
        alert('Failed to leave household. Please try again.');
      }
    }
  };

  return {
    households,
    loading,
    handleSwitchHousehold,
    handleLeaveHousehold,
  };
}
