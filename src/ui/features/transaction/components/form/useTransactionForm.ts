import { useState } from 'react';

import { createAllocationUseCase } from '@/application/ledger/use_cases/createAllocationUseCase';
import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { getIntentMapping } from '@/domains/ledger/intentMapping';
import { useAuth } from '@/infra/contexts/useAuth';
import { type TransactionCreate } from '@/infra/schemas/ledger';
import { useProjects } from '@/ui/features/project/hooks/useProjects';

export interface TransactionFormData {
  date: Date;
  amount: string;
  intent: string; // from IntentMapping intent
  projectId: string; // Empty if allocation is used, otherwise the ID
  description: string;
  allocations: { projectId: string; percentage: string }[];
}

export const useTransactionForm = (
  householdId: string,
  onClose: () => void,
  onSuccess?: () => void,
) => {
  const { userProfile } = useAuth();
  const { projects, loading: projectsLoading } = useProjects(householdId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<TransactionFormData>({
    date: new Date(),
    amount: '',
    intent: 'FOOD', // Default
    projectId: '',
    description: '',
    allocations: [],
  });

  const [showAllocations, setShowAllocations] = useState(false);

  const formChanged = <K extends keyof TransactionFormData>(
    name: K,
    value: TransactionFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.email) return;

    setError('');
    setLoading(true);

    try {
      const amountNum = parseFloat(formData.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Please enter a valid amount.');
      }

      if (showAllocations && formData.allocations.length === 0) {
        throw new Error('Please allocate to at least one project.');
      }

      if (!showAllocations && !formData.projectId) {
        throw new Error('Please select a project.');
      }

      const mapping = getIntentMapping(formData.intent);
      if (!mapping) {
        throw new Error('Invalid intent selected.');
      }

      // Validate Allocations equal 100% early
      const totalPercentage = formData.allocations.reduce(
        (sum, a) => sum + (parseFloat(a.percentage) || 0),
        0,
      );
      if (showAllocations && Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error(
          `Allocation percentages must sum to 100%. Current sum: ${totalPercentage}%`,
        );
      }

      // Prepare standard transaction data according to Intent Type mapping
      const transactionData: TransactionCreate = {
        date: formData.date,
        description: formData.description,
        intentType: mapping.type,
        intent: mapping.intent,
        amount: amountNum,
        projectId: showAllocations ? null : formData.projectId,
        allocationId: null,
        createdBy: userProfile.email,
        entries: [
          {
            ledgerCode: mapping.debitLedgerCode,
            debit: amountNum,
            credit: 0,
          },
          {
            ledgerCode: mapping.creditLedgerCode,
            debit: 0,
            credit: amountNum,
          },
        ],
      };

      // 1. Create standard transaction
      const transactionId = await createTransactionUseCase.execute({
        householdId,
        userEmail: userProfile.email,
        data: transactionData,
      });

      // 2. Create allocation if applicable
      if (showAllocations && formData.allocations.length > 0) {
        const allocationItems = formData.allocations.map((a) => ({
          projectId: a.projectId,
          percentage: parseFloat(a.percentage) || 0,
        }));

        await createAllocationUseCase.execute({
          householdId,
          userEmail: userProfile.email,
          data: {
            transactionId,
            totalAmount: amountNum,
            items: allocationItems,
          },
        });
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to save transaction.');
    } finally {
      setLoading(false);
    }
  };

  const totalPercentage = formData.allocations.reduce(
    (sum, a) => sum + (parseFloat(a.percentage) || 0),
    0,
  );

  return {
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
  };
};
