import React, { useState } from 'react';

import { ArrowRightLeft } from 'lucide-react';

import { projectService } from '@/domains/project/projectService';
import { type Project } from '@/domains/project/schemas';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';

interface ProjectTransferProps {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  userEmail: string;
  projects: Project[];
  onSuccess: () => void;
}

const ProjectTransfer: React.FC<ProjectTransferProps> = ({
  isOpen,
  onClose,
  householdId,
  userEmail,
  projects,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromProjectId, setFromProjectId] = useState<string>('');
  const [toProjectId, setToProjectId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);

  const activeProjects = projects.filter((p) => p.isActive);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromProjectId || !toProjectId || amount <= 0) {
      setError('Please fill in all fields correctly.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await projectService.transferBetweenProjects(
        householdId,
        {
          fromProjectId,
          toProjectId,
          amount,
        },
        userEmail,
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Transfer failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="text-blue-500" size={20} />
            <DialogTitle>Project Balance Transfer</DialogTitle>
          </div>
        </DialogHeader>

        <form onSubmit={handleTransfer} className="space-y-6 py-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>From Project</Label>
              <Select value={fromProjectId} onValueChange={setFromProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source project" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.icon} {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Project</Label>
              <Select value={toProjectId} onValueChange={setToProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target project" />
                </SelectTrigger>
                <SelectContent>
                  {activeProjects
                    .filter((p) => p.id !== fromProjectId)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Amount</Label>
              <Input
                id="transfer-amount"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                placeholder="0.00"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose} type="button" disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !fromProjectId || !toProjectId || amount <= 0}
            >
              {loading ? 'Transferring...' : 'Transfer Now'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectTransfer;
