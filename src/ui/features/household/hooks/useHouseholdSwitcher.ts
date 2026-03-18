import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { getHouseholdsByUserUseCase } from '@/application/household/use_cases/getHouseholdsByUserUseCase';
import { leaveHouseholdUseCase } from '@/application/household/use_cases/leaveHouseholdUseCase';
import { switchHouseholdUseCase } from '@/application/household/use_cases/switchHouseholdUseCase';
import { useAuth } from '@/infra/contexts/useAuth';
import { type Household } from '@/infra/schemas/household';

export function useHouseholdSwitcher(
  currentHouseholdId: string | undefined,
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
) {
  const { currentUser, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHouseholds = async () => {
      if (!currentUser || !isOpen) return;

      setLoading(true);
      try {
        const userHouseholds = await getHouseholdsByUserUseCase.execute({ uid: currentUser.uid });
        setHouseholds(userHouseholds);
      } catch (error) {
        console.error('Error fetching households:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHouseholds();
  }, [currentUser, isOpen]);

  const handleSwitchHousehold = async (householdId: string) => {
    if (!currentUser || householdId === currentHouseholdId) return;

    try {
      await switchHouseholdUseCase.execute({ uid: currentUser.uid, householdId });
      await refreshProfile();
      navigate('/');
      setIsOpen(false);
    } catch (error) {
      console.error('Error switching household:', error);
      alert('Failed to switch household. Please try again.');
    }
  };

  const handleLeaveHousehold = async () => {
    if (!currentUser) return;

    if (window.confirm('Are you sure you want to leave this household?')) {
      try {
        await leaveHouseholdUseCase.execute({ uid: currentUser.uid });
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
