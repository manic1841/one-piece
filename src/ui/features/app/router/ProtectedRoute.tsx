import React, { useEffect, useState } from 'react';

import { Navigate, useLocation } from 'react-router-dom';

import { isUserAuthorizedUseCase } from '@/application/access_control/use_cases/isUserAuthorizedUseCase';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { useAuth } from '@/infra/contexts/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireHousehold?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireHousehold = false }) => {
  const { currentUser, userProfile, loading, isAdmin } = useAuth();
  const location = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(isAdmin);
  const [isMemberOfHousehold, setIsMemberOfHousehold] = useState<boolean | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthorization = async () => {
      if (!currentUser) {
        setCheckingAuth(false);
        return;
      }

      try {
        // Whitelist check
        if (!isAdmin) {
          const authorized = await isUserAuthorizedUseCase.execute({ email: currentUser.email });
          setIsAuthorized(authorized);
        }

        // Household membership check
        if (requireHousehold && userProfile?.householdId) {
          try {
            await householdPermissionService.assertReadPermission(
              userProfile.householdId,
              currentUser.uid,
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
          `[ProtectedRoute] Authorization check failed for user ${currentUser.uid} with email ${currentUser.email}:`,
          error,
        );
        setIsAuthorized(false);
        setIsMemberOfHousehold(false);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuthorization();
  }, [currentUser, isAdmin, requireHousehold, userProfile?.householdId]);

  if (loading || checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!currentUser) {
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
