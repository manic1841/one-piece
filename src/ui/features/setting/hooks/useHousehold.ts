import { useState } from 'react';
import { joinHouseholdUseCase } from '@/application/household/use_cases/joinHouseholdUseCase';
import { addHouseholdMemberUseCase } from '@/application/household/use_cases/addHouseholdMemberUseCase';
import { updateHouseholdMemberRoleUseCase } from '@/application/household/use_cases/updateHouseholdMemberRoleUseCase';
import { removeHouseholdMemberUseCase } from '@/application/household/use_cases/removeHouseholdMemberUseCase';
import { leaveHouseholdUseCase } from '@/application/household/use_cases/leaveHouseholdUseCase';
import { switchHouseholdUseCase } from '@/application/household/use_cases/switchHouseholdUseCase';
import { type UserProfile } from '@/domains/user/types';
import { type AuthContext } from '@/application/types';

export function useHousehold() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinHousehold = async (householdId: string, user: UserProfile) => {
    setLoading(true);
    setError(null);
    try {
      await joinHouseholdUseCase.execute({ householdId, user });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (householdId: string, email: string, role: string, auth: AuthContext) => {
    setLoading(true);
    setError(null);
    try {
      await addHouseholdMemberUseCase.execute({
        householdId,
        email,
        role,
        adminEmail: auth.email || 'system'
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const updateMemberRole = async (
    householdId: string, 
    targetUid: string, 
    newRole: string, 
    auth: AuthContext
  ) => {
    setLoading(true);
    setError(null);
    try {
      await updateHouseholdMemberRoleUseCase.execute({
        householdId,
        targetUid,
        newRole,
        adminEmail: auth.email || 'system'
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (householdId: string, targetUid: string, auth: AuthContext) => {
    setLoading(true);
    setError(null);
    try {
      await removeHouseholdMemberUseCase.execute({
        householdId,
        targetUid,
        adminEmail: auth.email || 'system'
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const leaveHousehold = async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      await leaveHouseholdUseCase.execute({ uid });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const switchHousehold = async (uid: string, householdId: string) => {
    setLoading(true);
    setError(null);
    try {
      await switchHouseholdUseCase.execute({ uid, householdId });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { 
    joinHousehold, 
    addMember, 
    updateMemberRole, 
    removeMember, 
    leaveHousehold, 
    switchHousehold, 
    loading, 
    error 
  };
}
