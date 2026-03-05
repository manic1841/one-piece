import React, { useState } from 'react';

import { Mail, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EmailWhitelistUIProps {
  whitelist: string[];
  loading: boolean;
  saving: boolean;
  error: string;
  onAdd: (email: string) => Promise<void>;
  onRemove: (email: string) => Promise<void>;
}

const EmailWhitelistUI: React.FC<EmailWhitelistUIProps> = ({
  whitelist,
  loading,
  saving,
  error: propError,
  onAdd,
  onRemove,
}) => {
  const [newEmail, setNewEmail] = useState('');
  const [localError, setLocalError] = useState('');

  const error = propError || localError;

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setLocalError('Please enter an email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Please enter a valid email address');
      return;
    }

    if (whitelist.includes(email)) {
      setLocalError('This email is already in the whitelist');
      return;
    }

    try {
      await onAdd(email);
      setNewEmail('');
    } catch {
      // Error handled by parent hook
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!confirm(`Remove ${email} from whitelist?`)) return;
    try {
      await onRemove(email);
    } catch {
      // Error handled by parent hook
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Whitelist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Email Whitelist</CardTitle>
            <CardDescription>Only whitelisted users can access this application</CardDescription>
          </div>
          <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {whitelist.length} {whitelist.length === 1 ? 'user' : 'users'}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Add Email Form */}
        <form onSubmit={handleAddEmail} className="space-y-2">
          <Label htmlFor="new-email">Add Email to Whitelist</Label>
          <div className="flex gap-2">
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="user@example.com"
              disabled={saving}
              className="flex-1"
            />
            <Button type="submit" disabled={saving}>
              <Plus size={18} />
              Add
            </Button>
          </div>
        </form>

        {/* Whitelist */}
        <div className="space-y-2">
          {whitelist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No emails in whitelist</div>
          ) : (
            whitelist.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:border-muted-foreground/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-muted-foreground" />
                  <span className="font-medium text-foreground">{email}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveEmail(email)}
                  disabled={saving}
                  className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                  title="Remove"
                >
                  <X size={18} />
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailWhitelistUI;
