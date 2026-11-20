import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuthState } from '@/ui/contexts/useAuthState';

export function useHouseholdGuard(): { familyName: string; loadingHousehold: boolean } {
  const { userProfile } = useAuthState();
  const navigate = useNavigate();
  const [familyName, setFamilyName] = useState<string>('');
  const [loadingHousehold, setLoadingHousehold] = useState(true);

  useEffect(() => {
    const fetchHousehold = async () => {
      if (!userProfile) {
        setLoadingHousehold(false);
        return;
      }

      if (!userProfile.householdId) {
        setLoadingHousehold(false);
        navigate('/onboarding', { replace: true });
        return;
      }

      try {
        // The household name is a Firestore read; importing on demand keeps
        // Firestore out of the startup bundle (the login screen never needs it).
        const { getHouseholdUseCase } = await import(
          '@/application/household/use_cases/getHouseholdUseCase'
        );
        const household = await getHouseholdUseCase.execute({
          householdId: userProfile.householdId,
        });

        if (household) {
          setFamilyName(household.name);
        } else {
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        console.error('Error fetching household:', error);
        navigate('/onboarding', { replace: true });
      } finally {
        setLoadingHousehold(false);
      }
    };

    fetchHousehold();
  }, [navigate, userProfile]);

  return { familyName, loadingHousehold };
}
