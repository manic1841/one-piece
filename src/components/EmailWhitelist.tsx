import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { accessControlService } from '../services/accessControlService';
import { Mail, X, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const EmailWhitelist: React.FC = () => {
  const { currentUser } = useAuth();
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWhitelist();
  }, []);

  const loadWhitelist = async () => {
    setLoading(true);
    try {
      const emails = await accessControlService.getWhitelist();
      setWhitelist(emails);
    } catch (err) {
      console.error('Error loading whitelist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser?.uid) {
      setError('User not authenticated');
      return;
    }

    const email = newEmail.trim().toLowerCase();
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (whitelist.includes(email)) {
      setError('This email is already in the whitelist');
      return;
    }

    setSaving(true);
    try {
      await accessControlService.addEmailToWhitelist(email, currentUser.uid);
      await loadWhitelist();
      setNewEmail('');
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to add email');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!currentUser?.uid) return;

    if (!confirm(`Remove ${email} from whitelist?`)) return;

    setSaving(true);
    try {
      await accessControlService.removeEmailFromWhitelist(email, currentUser.uid);
      await loadWhitelist();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to remove email');
    } finally {
      setSaving(false);
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
        {error && <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">{error}</div>}

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

export default EmailWhitelist;
