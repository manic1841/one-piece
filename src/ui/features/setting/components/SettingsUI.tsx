import React from 'react';

import { type User } from 'firebase/auth';
import { ShieldAlert } from 'lucide-react';

import { type Household } from '@/domains/household/schemas';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';

import EmailWhitelistUI from './EmailWhitelistUI';
import MemberManagementUI from './MemberManagementUI';

interface SettingsUIProps {
  isAdmin: boolean;
  isHouseholdOwnerOrAdmin: boolean;
  isSettingsAuthorized: boolean;
  loading: boolean;
  // Whitelist props
  whitelist: string[];
  whitelistLoading: boolean;
  whitelistSaving: boolean;
  whitelistError: string;
  addWhitelistEmail: (email: string) => Promise<void>;
  removeWhitelistEmail: (email: string) => Promise<void>;
  // Member management props
  household: Household | null;
  memberProfiles: Record<string, { email: string; displayName: string }>;
  memberLoading: boolean;
  memberError: string;
  memberSuccess: string;
  addHouseholdMember: (email: string, role: string) => Promise<void>;
  removeHouseholdMember: (uid: string) => Promise<void>;
  updateMemberRole: (uid: string, newRole: string) => Promise<void>;
  currentUser: User | null;
}

const SettingsUI: React.FC<SettingsUIProps> = (props) => {
  const {
    isAdmin,
    isHouseholdOwnerOrAdmin,
    isSettingsAuthorized,
    loading,
    whitelist,
    whitelistLoading,
    whitelistSaving,
    whitelistError,
    addWhitelistEmail,
    removeWhitelistEmail,
    household,
    memberProfiles,
    memberLoading,
    memberError,
    memberSuccess,
    addHouseholdMember,
    removeHouseholdMember,
    updateMemberRole,
    currentUser,
  } = props;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isSettingsAuthorized) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <Card>
          <CardContent className="p-12">
            <div className="text-center max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <ShieldAlert size={32} className="text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                Only administrators or household owners/admins can access the Settings page.
              </p>
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your household and system settings</p>
      </div>

      {isAdmin && (
        <section className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-sm p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <ShieldAlert size={20} />
              </div>
              <div>
                <p className="font-semibold">System Administrator Access</p>
                <p className="text-sm opacity-90">You have full system privileges</p>
              </div>
            </div>
          </div>
          <EmailWhitelistUI
            whitelist={whitelist}
            loading={whitelistLoading}
            saving={whitelistSaving}
            error={whitelistError}
            onAdd={addWhitelistEmail}
            onRemove={removeWhitelistEmail}
          />
        </section>
      )}

      {isHouseholdOwnerOrAdmin && (
        <section className="space-y-4">
          <MemberManagementUI
            household={household}
            memberProfiles={memberProfiles}
            loading={memberLoading}
            error={memberError}
            success={memberSuccess}
            onAdd={addHouseholdMember}
            onRemove={removeHouseholdMember}
            onUpdateRole={updateMemberRole}
            currentUser={currentUser}
          />
        </section>
      )}
    </div>
  );
};

export default SettingsUI;
