import { useCallback, useEffect, useState } from 'react';

import { getHouseholdUseCase } from '@/application/household/use_cases/getHouseholdUseCase';
import { type Household } from '@/domains/household/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useGetUserProfile } from '@/ui/features/setting/hooks/useGetUserProfile';
import { useHousehold } from '@/ui/features/setting/hooks/useHousehold';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

/**
 * Household 區段的控制器：取得 household 文檔與成員 profile，並提供成員增刪改。
 */
export function useHouseholdSettingsPage() {
  const { user, userProfile } = useAuthState();
  const authContext = useAuthIdentity();
  const {
    addMember: addMemberHook,
    removeMember: removeMemberHook,
    updateMemberRole: updateMemberRoleHook,
    loading: memberLoading,
    error: memberError,
  } = useHousehold();
  const { execute: getUserProfile } = useGetUserProfile();

  const [household, setHousehold] = useState<Household | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<
    Record<string, { email: string; displayName: string }>
  >({});
  const [memberSuccess, setMemberSuccess] = useState('');

  const householdId = userProfile?.householdId;

  const fetchHouseholdData = useCallback(async () => {
    if (!householdId) return;

    try {
      const data = await getHouseholdUseCase.execute({ householdId });
      setHousehold(data);
      if (!data || !user) return;

      const profiles: Record<string, { email: string; displayName: string }> = {};
      await Promise.all(
        Object.keys(data.members).map(async (uid) => {
          const profile = await getUserProfile(uid);
          if (profile) {
            profiles[uid] = {
              email: profile.email,
              displayName: profile.displayName || profile.email,
            };
          }
        }),
      );
      setMemberProfiles(profiles);
    } catch (err) {
      console.error('Error fetching household:', err);
    }
  }, [householdId, user, getUserProfile]);

  useEffect(() => {
    const init = async () => {
      await fetchHouseholdData();
    };
    void init();
  }, [fetchHouseholdData]);

  const addHouseholdMember = async (email: string, role: string) => {
    if (!household) return;
    setMemberSuccess('');
    await addMemberHook(household.id, email, role, authContext);
    setMemberSuccess(`User ${email} has been added to the household.`);
    await fetchHouseholdData();
  };

  const removeHouseholdMember = async (uid: string) => {
    if (!household) return;
    await removeMemberHook(household.id, uid, authContext);
    await fetchHouseholdData();
  };

  const updateMemberRole = async (uid: string, newRole: string) => {
    if (!household) return;
    await updateMemberRoleHook(household.id, uid, newRole, authContext);
    await fetchHouseholdData();
  };

  return {
    currentUid: user?.uid ?? '',
    household,
    memberProfiles,
    memberLoading,
    memberError: memberError || '',
    memberSuccess,
    addHouseholdMember,
    removeHouseholdMember,
    updateMemberRole,
  };
}
