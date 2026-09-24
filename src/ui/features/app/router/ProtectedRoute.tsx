import React, { useEffect, useState } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { isUserAuthorizedUseCase } from '@/application/auth/use_cases/isUserAuthorizedUseCase';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { useAuthState } from '@/ui/contexts/useAuthState';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireHousehold?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireHousehold = false }) => {
  const { user, userProfile, loading, isAdmin } = useAuthState();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(isAdmin);
  const [isMemberOfHousehold, setIsMemberOfHousehold] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!user) {
        setCheckingAuth(false);
        return;
      }

      try {
        // Whitelist check
        if (!isAdmin) {
          const authorized = await isUserAuthorizedUseCase.execute({ email: user.email });
          setIsAuthorized(authorized);
        }

        // Household membership check
        if (requireHousehold && userProfile?.householdId) {
          try {
            await householdPermissionService.assertReadPermission(
              userProfile.householdId,
              user.uid,
              isAdmin,
            );
            setIsMemberOfHousehold(true);
          } catch {
            setIsMemberOfHousehold(false);
          }
        } else {
          setIsMemberOfHousehold(true);
        }
      } catch (error) {
        console.error(
          `[ProtectedRoute] Authorization check failed for user ${user.uid} with email ${user.email}:`,
          error,
        );
        setIsAuthorized(false);
        setIsMemberOfHousehold(false);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuthorization();
  }, [user, isAdmin, requireHousehold, userProfile?.householdId]);

  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check whitelist authorization
  if (isAuthorized === false) {
    return <Navigate to="/access-denied" replace />;
  }

  if (requireHousehold && (!userProfile?.householdId || isMemberOfHousehold === false)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
