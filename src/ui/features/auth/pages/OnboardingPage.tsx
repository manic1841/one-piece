import React from 'react';

import { LogOut } from 'lucide-react';

import { useOnboarding } from '@/ui/features/auth/hooks/useOnboarding';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';

const Onboarding: React.FC = () => {
  const { input, setInput, loading, error, handleSubmit, handleLogout } = useOnboarding();

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
