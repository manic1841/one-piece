import React, { useState } from 'react';

import { doc, getDoc } from 'firebase/firestore';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { useAuth } from '../contexts/useAuth';
import { db } from '../firebase';

const Login: React.FC = () => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch (err) {
      setError('Failed to log in with Google');
      console.error(err);
    }
    setLoading(false);
  };

  const testConnection = async () => {
    setLoading(true);
    setError('');
    try {
      await getDoc(doc(db, 'test_connection', 'ping'));
      alert('Firebase Connection Successful! (Read succeeded)');
    } catch (err) {
      const error = err as { code?: string; message?: string };
      if (error.code === 'permission-denied') {
        alert(
          'Firebase Connection Successful! (Reached Firestore, but permission denied as expected)',
        );
      } else {
        console.error(err);
        setError('Connection Failed: ' + (error.message || 'Unknown error'));
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center font-bold">Welcome to One Piece</CardTitle>
          <CardDescription className="text-center">
            Please sign in with your Google account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Button
              variant="default"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 text-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>

            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                onClick={testConnection}
                disabled={loading}
                className="w-full text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                Test Firebase Connection
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
