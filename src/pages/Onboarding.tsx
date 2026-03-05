import React, { useState } from 'react';

import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useAuth } from '../contexts/useAuth';
import { householdService } from '../services/householdService';

const Onboarding: React.FC = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { currentUser, userProfile, isAdmin, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.email) return;

    if (!input.trim()) {
      setError('Please enter a household name or ID');
      return;
    }

    setError('');
    setLoading(true);

    try {
      if (!userProfile) {
        throw new Error('User profile not found');
      }
      await householdService.createOrJoinHousehold(input, userProfile, isAdmin);

      // Refresh auth context to get updated householdId
      if (refreshProfile) {
        await refreshProfile();
      }

      navigate('/');
    } catch (err) {
      console.error(err);
      const error = err as Error;
      setError(error.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Create or Join Family</CardTitle>
              <CardDescription className="mt-1.5">
                Enter a household name or ID to get started
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut size={20} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="household">Household Name or ID</Label>
              <Input
                id="household"
                type="text"
                required
                placeholder="Enter a name to create or ID to join"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Processing...' : 'Continue'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
