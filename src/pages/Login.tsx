import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';


import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '../contexts/useAuth';
import { db } from '../firebase';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, signup, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setError('Failed to ' + (isLogin ? 'log in' : 'sign up'));
      console.error(err);
    }

    setLoading(false);
  };

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
      // Try to access a random document.
      // Even if it fails with permission-denied, it means we reached Firebase.
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
          <CardTitle className="text-2xl text-center">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </CardTitle>
          <CardDescription className="text-center">
            Enter your email and password to {isLogin ? 'sign in' : 'create an account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {isLogin ? 'Sign in' : 'Sign up'}
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <Button
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full"
            >
              Sign in with Google
            </Button>

            <Button
              variant="outline"
              onClick={testConnection}
              disabled={loading}
              className="w-full text-muted-foreground"
            >
              Test Firebase Connection
            </Button>
          </div>

          <div className="text-center mt-6">
            <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="text-sm">
              {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
