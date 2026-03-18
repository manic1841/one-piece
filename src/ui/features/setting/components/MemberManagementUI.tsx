import React, { useState } from 'react';

import { type User } from 'firebase/auth';
import { Mail, Plus, ShieldCheck, User as UserIcon, X } from 'lucide-react';

import { RoleEnum } from '@/domains/auth/role';
import { type Household } from '@/infra/schemas/household';
import { Button } from '@/ui/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';

interface MemberManagementUIProps {
  household: Household | null;
  memberProfiles: Record<string, { email: string; displayName: string }>;
  loading: boolean;
  error: string;
  success: string;
  onAdd: (email: string, role: string) => Promise<void>;
  onRemove: (uid: string) => Promise<void>;
  onUpdateRole: (uid: string, newRole: string) => Promise<void>;
  currentUser: User | null;
}

const MemberManagementUI: React.FC<MemberManagementUIProps> = ({
  household,
  memberProfiles,
  loading,
  error,
  success,
  onAdd,
  onRemove,
  onUpdateRole,
  currentUser,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(RoleEnum.MEMBER);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onAdd(email, role);
      setEmail('');
    } catch {
      // Error handled by hook
    }
  };

  if (!household) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="text-primary" size={20} />
            Household Member Management
          </CardTitle>
          <CardDescription>
            Add members to your household and manage their permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add member form */}
          <form
            onSubmit={handleAddMember}
            className="space-y-4 mb-8 p-4 bg-muted/30 rounded-lg border"
          >
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Plus size={16} /> Add New Member
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 col-span-1 md:col-span-1">
                <Label htmlFor="member-email">Email Address</Label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    size={16}
                  />
                  <Input
                    id="member-email"
                    type="email"
                    placeholder="user@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Assign Role</Label>
                <select
                  id="member-role"
                  className="w-full h-10 px-3 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value={RoleEnum.MEMBER}>Member</option>
                  <option value={RoleEnum.ADMIN}>Admin</option>
                  <option value={RoleEnum.GUEST}>Guest</option>
                  <option value={RoleEnum.OWNER}>Owner</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={loading || !email}>
                  {loading ? 'Adding...' : 'Add Member'}
                </Button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-green-600 font-medium">{success}</p>}
          </form>

          {/* Members list */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldCheck size={16} /> Current Members ({Object.keys(household.members).length})
            </h3>
            <div className="border rounded-lg overflow-hidden divide-y">
              {Object.entries(household.members).map(([uid, member]) => (
                <div
                  key={uid}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                      {(memberProfiles[uid]?.displayName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {memberProfiles[uid]?.displayName || 'Loading...'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {memberProfiles[uid]?.email || uid}
                      </p>
                    </div>
                    {uid === currentUser?.uid && (
                      <span className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <select
                      className="h-8 px-2 py-1 bg-transparent border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      value={member.role}
                      disabled={uid === currentUser?.uid || loading}
                      onChange={(e) => onUpdateRole(uid, e.target.value)}
                    >
                      <option value={RoleEnum.OWNER}>Owner</option>
                      <option value={RoleEnum.ADMIN}>Admin</option>
                      <option value={RoleEnum.MEMBER}>Member</option>
                      <option value={RoleEnum.GUEST}>Guest</option>
                    </select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      disabled={uid === currentUser?.uid || loading}
                      onClick={() => onRemove(uid)}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberManagementUI;
