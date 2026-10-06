import React from 'react';

import { LogOut } from 'lucide-react';

import { GateSurface } from '@/ui/components/GateSurface';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  TextInput,
} from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { useOnboarding } from '@/ui/features/auth/hooks/useOnboarding';

const Onboarding: React.FC = () => {
  const { form, submit, error, isSubmitting, handleLogout } = useOnboarding();

  return (
    <GateSurface className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold text-foreground">Create or Join Family</h1>
          <p className="text-sm text-muted-foreground">
            Enter a household name or ID to get started
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
          <LogOut size={20} aria-hidden="true" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <FormField name="input">
            <FormItem>
              <FormLabel required>Household Name or ID</FormLabel>
              <FormControl>
                <TextInput placeholder="Enter a name to create or ID to join" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Processing...' : 'Continue'}
          </Button>
        </form>
      </Form>
    </GateSurface>
  );
};

export default Onboarding;
