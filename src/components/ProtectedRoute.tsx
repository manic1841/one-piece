import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { accessControlService } from '../services/accessControlService';

interface ProtectedRouteProps {
    children: React.ReactNode;
    requireHousehold?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireHousehold = false }) => {
    const { currentUser, userProfile, loading } = useAuth();
    const location = useLocation();
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        checkAuthorization();
    }, [currentUser]);

    const checkAuthorization = async () => {
        if (!currentUser) {
            setCheckingAuth(false);
            return;
        }

        try {
            const authorized = await accessControlService.isUserAuthorized(
                currentUser.uid,
                currentUser.email
            );
            setIsAuthorized(authorized);
        } catch (error) {
            console.error('Authorization check failed:', error);
            setIsAuthorized(false);
        } finally {
            setCheckingAuth(false);
        }
    };

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

    if (requireHousehold && !userProfile?.householdId) {
        return <Navigate to="/onboarding" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
