import { useCallback, useEffect, useState } from 'react';

import { getHouseholdUseCase } from '@/application/household/use_cases/getHouseholdUseCase';
import { type AuthContext } from '@/application/types';
import { RoleEnum } from '@/domains/auth/role';
import { useAuth } from '@/infra/contexts/useAuth';
import { type Household } from '@/infra/schemas/household';
import { useGetUserProfile } from '@/ui/features/setting/hooks/useGetUserProfile';
import { useHousehold } from '@/ui/features/setting/hooks/useHousehold';
import { useWhitelist } from '@/ui/features/setting/hooks/useWhitelist';

export const useSettingsPage = () => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const authContext: AuthContext = {
    uid: currentUser?.uid || '',
    email: currentUser?.email || undefined,
    isGlobalAdmin: isAdmin,
  };

  const [loading, setLoading] = useState(true);

  // --- New Hooks ---
  const {
    fetchWhitelist,
    addEmail: addWhitelistEmailHook,
    removeEmail: removeWhitelistEmailHook,
    loading: whitelistLoading,
    error: whitelistError,
  } = useWhitelist();

  const {
    addMember: addHouseholdMemberHook,
    removeMember: removeHouseholdMemberHook,
    updateMemberRole: updateMemberRoleHook,
    loading: memberLoading,
    error: memberError,
  } = useHousehold();

  const { execute: getUserProfile } = useGetUserProfile();

  // --- Whitelist State ---
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [whitelistSaving, setWhitelistSaving] = useState(false);

  // --- Household Member State ---
  const [household, setHousehold] = useState<Household | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<
    Record<string, { email: string; displayName: string }>
  >({});
  const [memberSuccess, setMemberSuccess] = useState('');

  // --- Authorization ---
  const [householdRole, setHouseholdRole] = useState<string | null>(null);

  const fetchHouseholdData = useCallback(async () => {
    if (userProfile?.householdId) {
      try {
        const data = await getHouseholdUseCase.execute({ householdId: userProfile.householdId });
        setHousehold(data);

        if (data && currentUser) {
          setHouseholdRole(data.members[currentUser.uid]?.role || null);

          // Fetch profiles for all members
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
        }
      } catch (err) {
        console.error('Error fetching household:', err);
      }
    }
  }, [userProfile?.householdId, currentUser, getUserProfile]);

  const refreshWhitelist = useCallback(async () => {
    if (!isAdmin) return;
    const emails = await fetchWhitelist();
    setWhitelist(emails);
  }, [isAdmin, fetchWhitelist]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchHouseholdData(), refreshWhitelist()]);
      setLoading(false);
    };
    if (currentUser) {
      init();
    }
  }, [currentUser, fetchHouseholdData, refreshWhitelist]);

  // --- Actions ---
  const addWhitelistEmail = async (email: string) => {
    setWhitelistSaving(true);
    try {
      await addWhitelistEmailHook(email);
      await refreshWhitelist();
    } finally {
      setWhitelistSaving(false);
    }
  };

  const removeWhitelistEmail = async (email: string) => {
    setWhitelistSaving(true);
    try {
      await removeWhitelistEmailHook(email);
      await refreshWhitelist();
    } finally {
      setWhitelistSaving(false);
    }
  };

  const addHouseholdMember = async (email: string, role: string) => {
    if (!household) return;
    setMemberSuccess('');
    await addHouseholdMemberHook(household.id, email, role, authContext);
    setMemberSuccess(`User ${email} has been added to the household.`);
    await fetchHouseholdData();
  };

  const removeHouseholdMember = async (uid: string) => {
    if (!household) return;
    await removeHouseholdMemberHook(household.id, uid, authContext);
    await fetchHouseholdData();
  };

  const updateMemberRole = async (uid: string, newRole: string) => {
    if (!household) return;
    await updateMemberRoleHook(household.id, uid, newRole, authContext);
    await fetchHouseholdData();
  };

  const isHouseholdOwnerOrAdmin =
    householdRole === RoleEnum.OWNER || householdRole === RoleEnum.ADMIN;

  return {
    // State
    currentUser,
    userProfile,
    isAdmin,
    loading,
    isSettingsAuthorized: isAdmin || isHouseholdOwnerOrAdmin,

    // Whitelist
    whitelist,
    whitelistLoading,
    whitelistSaving,
    whitelistError: whitelistError || '',
    addWhitelistEmail,
    removeWhitelistEmail,

    // Household
    household,
    memberProfiles,
    memberLoading,
    memberError: memberError || '',
    memberSuccess,
    isHouseholdOwnerOrAdmin,
    addHouseholdMember,
    removeHouseholdMember,
    updateMemberRole,
    refreshHousehold: fetchHouseholdData,
  };
};
