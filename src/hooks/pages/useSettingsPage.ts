import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/useAuth';
import { RoleEnum } from '@/domains/auth/role';
import { type Household } from '@/schemas';
import { accessControlService } from '@/services/accessControlService';
import { householdService } from '@/services/householdService';
import { userService } from '@/services/userService';

export const useSettingsPage = () => {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);

  // --- Whitelist State ---
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [whitelistSaving, setWhitelistSaving] = useState(false);
  const [whitelistError, setWhitelistError] = useState('');

  // --- Household Member State ---
  const [household, setHousehold] = useState<Household | null>(null);
  const [memberProfiles, setMemberProfiles] = useState<
    Record<string, { email: string; displayName: string }>
  >({});
  const [memberLoading, setMemberLoading] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [memberSuccess, setMemberSuccess] = useState('');

  // --- Authorization ---
  const [householdRole, setHouseholdRole] = useState<string | null>(null);

  const fetchHousehold = useCallback(async () => {
    if (userProfile?.householdId) {
      setMemberLoading(true);
      try {
        const data = await householdService.getHousehold(userProfile.householdId);
        setHousehold(data);

        if (data && currentUser) {
          setHouseholdRole(data.members[currentUser.uid]?.role || null);

          // Fetch profiles for all members
          const profiles: Record<string, { email: string; displayName: string }> = {};
          await Promise.all(
            Object.keys(data.members).map(async (uid) => {
              const profile = await userService.getUserProfile(uid);
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
      } finally {
        setMemberLoading(false);
      }
    }
  }, [userProfile?.householdId, currentUser]);

  const fetchWhitelist = useCallback(async () => {
    if (!isAdmin) return;
    setWhitelistLoading(true);
    try {
      const emails = await accessControlService.getWhitelist();
      setWhitelist(emails);
    } catch (err) {
      console.error('Error loading whitelist:', err);
    } finally {
      setWhitelistLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchHousehold(), fetchWhitelist()]);
      setLoading(false);
    };
    if (currentUser) {
      init();
    }
  }, [currentUser, fetchHousehold, fetchWhitelist]);

  // --- Whitelist Actions ---
  const addWhitelistEmail = async (email: string) => {
    setWhitelistSaving(true);
    setWhitelistError('');
    try {
      await accessControlService.addEmailToWhitelist(email, isAdmin);
      await fetchWhitelist();
    } catch (err) {
      setWhitelistError(err instanceof Error ? err.message : 'Failed to add email');
      throw err;
    } finally {
      setWhitelistSaving(false);
    }
  };

  const removeWhitelistEmail = async (email: string) => {
    setWhitelistSaving(true);
    setWhitelistError('');
    try {
      await accessControlService.removeEmailFromWhitelist(email, isAdmin);
      await fetchWhitelist();
    } catch (err) {
      setWhitelistError(err instanceof Error ? err.message : 'Failed to remove email');
      throw err;
    } finally {
      setWhitelistSaving(false);
    }
  };

  // --- Member Actions ---
  const addHouseholdMember = async (email: string, role: string) => {
    if (!household || !currentUser) return;
    setMemberLoading(true);
    setMemberError('');
    setMemberSuccess('');
    try {
      await householdService.addMemberByEmail(
        household.id,
        email.toLowerCase().trim(),
        role,
        currentUser.email || 'system',
        { uid: currentUser.uid, isGlobalAdmin: isAdmin },
      );
      setMemberSuccess(`User ${email} has been added to the household.`);
      await fetchHousehold();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to add member');
      throw err;
    } finally {
      setMemberLoading(false);
    }
  };

  const removeHouseholdMember = async (uid: string) => {
    if (!household || !currentUser) return;
    setMemberLoading(true);
    setMemberError('');
    try {
      await householdService.removeMember(household.id, uid, currentUser.email || 'system', {
        uid: currentUser.uid,
        isGlobalAdmin: isAdmin,
      });
      await fetchHousehold();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to remove member');
      throw err;
    } finally {
      setMemberLoading(false);
    }
  };

  const updateMemberRole = async (uid: string, newRole: string) => {
    if (!household || !currentUser) return;
    setMemberLoading(true);
    setMemberError('');
    try {
      await householdService.updateMemberRole(
        household.id,
        uid,
        newRole,
        currentUser.email || 'system',
        { uid: currentUser.uid, isGlobalAdmin: isAdmin },
      );
      await fetchHousehold();
    } catch (err) {
      setMemberError(err instanceof Error ? err.message : 'Failed to update role');
      throw err;
    } finally {
      setMemberLoading(false);
    }
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
    whitelistError,
    addWhitelistEmail,
    removeWhitelistEmail,

    // Household
    household,
    memberProfiles,
    memberLoading,
    memberError,
    memberSuccess,
    isHouseholdOwnerOrAdmin,
    addHouseholdMember,
    removeHouseholdMember,
    updateMemberRole,
    refreshHousehold: fetchHousehold,
  };
};
