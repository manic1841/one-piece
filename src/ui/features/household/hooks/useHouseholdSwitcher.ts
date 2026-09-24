import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { getHouseholdsByUserUseCase } from '@/application/household/use_cases/getHouseholdsByUserUseCase';
import { leaveHouseholdUseCase } from '@/application/household/use_cases/leaveHouseholdUseCase';
import { switchHouseholdUseCase } from '@/application/household/use_cases/switchHouseholdUseCase';
import { type Household } from '@/domains/household/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useConfirm } from '@/ui/features/app/confirm/ConfirmDialog';

export function useHouseholdSwitcher(
  currentHouseholdId: string | undefined,
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
) {
  const { user, refreshProfile } = useAuthState();
  const navigate = useNavigate();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHouseholds = async () => {
      if (!user || !isOpen) return;

      setLoading(true);
      try {
        const userHouseholds = await getHouseholdsByUserUseCase.execute({ uid: user.uid });
        setHouseholds(userHouseholds);
      } catch (error) {
        console.error('Error fetching households:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHouseholds();
  }, [user, isOpen]);

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
