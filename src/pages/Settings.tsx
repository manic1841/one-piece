import { ShieldAlert } from 'lucide-react';
import React, { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import EmailWhitelist from '../components/EmailWhitelist';
import { useAuth } from '../contexts/useAuth';
import { accessControlService } from '../services/accessControlService';

const Settings: React.FC = () => {
  const { currentUser } = useAuth();

  const isAdmin = useMemo(() => {
    if (!currentUser) return false;
    return accessControlService.isAdmin(currentUser.uid); // sync
  }, [currentUser]);

  const loading = currentUser == null ? true : false;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
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
              <p className="text-muted-foreground mb-6">Only administrators can access the Settings page.</p>
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your account and application settings</p>
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
    </div>
  );
};

export default Settings;
