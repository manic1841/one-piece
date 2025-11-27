import React, { useMemo } from 'react';
import { useAuth } from '../contexts/useAuth';
import { accessControlService } from '../services/accessControlService';
import BudgetSettings from '../components/BudgetSettings';
import ProjectSettings from '../components/ProjectSettings';
import EmailWhitelist from '../components/EmailWhitelist';
import { ShieldAlert } from 'lucide-react';

const Settings: React.FC = () => {
  const { currentUser, userProfile } = useAuth();

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return accessControlService.isAdmin(currentUser.uid); // sync
  }, [currentUser]);

  const loading = currentUser == null ? true : false;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="text-center max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <ShieldAlert size={32} className="text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">Only administrators can access the Settings page.</p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account and application settings</p>
      </div>

      {/* Admin Badge */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-sm p-4 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="font-semibold">Administrator Access</p>
            <p className="text-sm opacity-90">You have full system privileges</p>
          </div>
        </div>
      </div>

      {/* Email Whitelist */}
      <EmailWhitelist />

      {/* Project Settings */}
      {userProfile?.householdId && <ProjectSettings householdId={userProfile.householdId} />}

      {/* Budget Settings */}
      {userProfile?.householdId && <BudgetSettings householdId={userProfile.householdId} />}
    </div>
  );
};

export default Settings;
