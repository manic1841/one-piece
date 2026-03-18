import React from 'react';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/ui/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/components/ui/select';

import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
import { useTransactionForm } from './useTransactionForm';
import { AllocationSection } from './AllocationSection'; // Extracted from legacy

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  householdId: string;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  householdId,
}) => {
  const {
    formData,
    formChanged,
    showAllocations,
    setShowAllocations,
    projects,
    projectsLoading,
    loading,
    error,
    save,
    totalPercentage,
  } = useTransactionForm(householdId, onClose, onSuccess);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增交易</DialogTitle>
        </DialogHeader>

        {error && <div className="p-3 bg-red-100 text-red-600 rounded-md text-sm">{error}</div>}

        <form onSubmit={save} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">日期</Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.date.toISOString().split('T')[0]}
                onChange={(e) => formChanged('date', new Date(e.target.value))}
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">金額</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => formChanged('amount', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Intent Type */}
            <div className="space-y-2">
              <Label>類別</Label>
              <Select
                value={formData.intent}
                onValueChange={(val) => formChanged('intent', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇交易類別" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_INTENT_MAPPINGS.map((mapping) => (
                    <SelectItem key={mapping.intent} value={mapping.intent}>
                      {mapping.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">說明 (選填)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => formChanged('description', e.target.value)}
                placeholder="輸入交易說明"
              />
            </div>
          </div>

          {/* Project Splitting Section */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label>專案分配</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allow-splits"
                  className="w-4 h-4"
                  checked={showAllocations}
                  onChange={(e) => setShowAllocations(e.target.checked)}
                />
                <Label htmlFor="allow-splits" className="text-sm font-normal cursor-pointer">
                  分配到多個專案
                </Label>
              </div>
            </div>

            {showAllocations ? (
              <AllocationSection
                projects={projects}
                allocations={formData.allocations}
                amount={formData.amount}
                totalPercentage={totalPercentage}
                onAllocationsChange={(allocations) => formChanged('allocations', allocations)}
              />
            ) : (
              <div className="space-y-2">
                <Select
                  value={formData.projectId}
                  onValueChange={(val) => formChanged('projectId', val)}
                  disabled={projectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={projectsLoading ? '載入中...' : '選擇專案'} />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.icon} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-6">
            <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '儲存中...' : '儲存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
