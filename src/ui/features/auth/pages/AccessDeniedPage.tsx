import React from 'react';

import { ShieldOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent } from '@/ui/components/ui/card';

const AccessDenied: React.FC = () => {
  const { logout } = useAuthState();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-muted flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-destructive/15 rounded-full mb-6">
            <ShieldOff size={40} className="text-destructive" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-3">Access Denied</h1>

          <p className="text-muted-foreground mb-8">
            You do not have permission to access this application. Please contact the administrator
            to request access.
          </p>

          <Button onClick={handleLogout} variant="destructive" className="w-full">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessDenied;
