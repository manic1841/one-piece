import { useCallback, useEffect, useState } from 'react';

import { exportHouseholdBackupUseCase } from '@/application/household/use_cases/exportHouseholdBackupUseCase';
import { getHouseholdUseCase } from '@/application/household/use_cases/getHouseholdUseCase';
import { importHouseholdBackupUseCase } from '@/application/household/use_cases/importHouseholdBackupUseCase';
import { type AuthContext } from '@/application/types';
import { RoleEnum } from '@/domains/auth/role';
import { type Household } from '@/domains/household/schemas';
import { useAuth } from '@/infra/contexts/useAuth';
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
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

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

  const exportHouseholdBackup = async () => {
    if (!household) return;

    setBackupLoading(true);
    setBackupError('');
    setBackupSuccess('');

    try {
      const backup = await exportHouseholdBackupUseCase.execute({
        householdId: household.id,
        auth: authContext,
      });

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateCode = new Date().toISOString().replace(/[:.]/g, '-');
      link.setAttribute('href', url);
      link.setAttribute('download', `household-backup-${household.id}-${dateCode}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupSuccess('備份檔已匯出完成。');
    } catch (err) {
      const message = err instanceof Error ? err.message : '匯出備份失敗';
      setBackupError(message);
    } finally {
      setBackupLoading(false);
    }
  };

  const restoreHouseholdBackup = async (file: File) => {
    if (!household) return;

    setRestoreLoading(true);
    setRestoreError('');
    setRestoreSuccess('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Parameters<
        typeof importHouseholdBackupUseCase.execute
      >[0]['backup'];

      const summary = await importHouseholdBackupUseCase.execute({
        householdId: household.id,
        auth: authContext,
        backup: parsed,
      });

      setRestoreSuccess(
        `還原完成：已清除 ${summary.deletedDocuments} 筆，並匯入 ${summary.restoredDocuments} 筆資料。`,
      );
      await fetchHouseholdData();
    } catch (err) {
      const message = err instanceof Error ? err.message : '還原備份失敗';
      setRestoreError(message);
    } finally {
      setRestoreLoading(false);
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
    backupLoading,
    backupError,
    backupSuccess,
    exportHouseholdBackup,
    restoreLoading,
    restoreError,
    restoreSuccess,
    restoreHouseholdBackup,
    refreshHousehold: fetchHouseholdData,
  };
};
