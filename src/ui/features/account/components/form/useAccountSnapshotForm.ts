import { useCallback, useEffect, useState } from 'react';

import { toSnapshot } from '@/domains/account/mappers/toSnapshot';
import { toSnapshotForm } from '@/domains/account/mappers/toSnapshotForm';
import {
  type Account,
  AccountCategory,
  type AccountSnapshot,
  type AccountSnapshotCreate,
  type Holding,
} from '@/domains/account/types';
import { type AccountSnapshotFormData } from '@/domains/account/types';
import { validateSnapshot } from '@/domains/account/validator';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';
import { useExchangeRate } from '@/ui/features/account/hooks/useExchangeRate';

export const useAccountSnapshotForm = (
  householdId?: string,
  selectedAccount?: Account,
  initialData?: AccountSnapshot,
  onSubmit?: (accountId: string, snapshot: AccountSnapshotCreate) => Promise<void>,
  onClose?: () => void,
) => {
  const { getPreviousSnapshot } = useAccountCmds(householdId || '');

  const [formData, setFormData] = useState<AccountSnapshotFormData>(() =>
    toSnapshotForm(selectedAccount?.id, selectedAccount?.currency, initialData),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { getRate, loading: fetchingRate } = useExchangeRate();
  const [previousAmount, setPreviousAmount] = useState<number | undefined>(undefined);

  const isInvestment = selectedAccount?.category === AccountCategory.SECURITIES; // Map to correct category

  const loadFormData = useCallback(() => {
    setFormData(toSnapshotForm(selectedAccount?.id, selectedAccount?.currency, initialData));
  }, [initialData, selectedAccount]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const updateFormData = (data: Partial<AccountSnapshotFormData>) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const loadPreviousAmount = useCallback(
    async (accountId: string, year: number, month: number) => {
      if (!householdId) return;
      try {
        const normalized = await getPreviousSnapshot(accountId, year, month);
        setPreviousAmount(normalized?.originalAmount || normalized?.amount);

        if (!initialData && normalized?.holdings && normalized.holdings.length > 0) {
          setFormData((prev) => {
            if (prev.holdings.length === 0) {
              return {
                ...prev,
                holdings: normalized.holdings!.map((h) => ({
                  symbol: h.symbol,
                  name: h.name || '',
                  quantity: h.quantity.toString(),
                  cost: h.cost.toString(),
                  marketValue: h.marketValue.toString(),
                  leverage: h.leverage?.toString() || '1',
                })),
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Failed to load previous amount:', err);
        setPreviousAmount(undefined);
      }
    },
    [householdId, getPreviousSnapshot, initialData],
  );

  useEffect(() => {
    if (formData?.accountId && formData?.year && formData?.month) {
      loadPreviousAmount(formData.accountId, parseInt(formData.year), parseInt(formData.month));
    }
  }, [formData?.accountId, formData?.year, formData?.month, loadPreviousAmount]);

  const fetchExchangeRate = useCallback(async () => {
    if (!formData.currency || formData.currency === 'TWD') return;
    setError('');
    try {
      const rate = await getRate(formData.currency, 'TWD');

      setFormData((prev) => {
        let newAmount = prev.amount;
        if (prev.originalAmount) {
          const calculated = Math.round(parseFloat(prev.originalAmount) * rate);
          newAmount = isNaN(calculated) ? prev.amount : calculated.toString();
        }
        return {
          ...prev,
          exchangeRate: rate.toString(),
          amount: newAmount,
        };
      });
    } catch (err) {
      console.error(err);
      setError('Failed to fetch exchange rate. Please try again.');
    }
  }, [formData.currency, getRate]);

  useEffect(() => {
    if (
      !isInvestment &&
      formData.currency !== 'TWD' &&
      formData.originalAmount &&
      formData.exchangeRate
    ) {
      const calculated = Math.round(
        parseFloat(formData.originalAmount) * parseFloat(formData.exchangeRate),
      );
      if (!isNaN(calculated) && calculated.toString() !== formData.amount) {
        setFormData((prev) => ({ ...prev, amount: calculated.toString() }));
      }
    }
  }, [
    formData.originalAmount,
    formData.exchangeRate,
    formData.currency,
    isInvestment,
    formData.amount,
  ]);

  // Update amount when holdings change for investment accounts
  useEffect(() => {
    if (isInvestment) {
      const totalValue = formData?.holdings.reduce(
        (sum, h: any) => sum + parseFloat(h.marketValue),
        0,
      );
      setFormData((prev) => {
        return { ...prev, amount: totalValue?.toString() || '0' };
      });
    }
  }, [formData?.holdings, isInvestment]);

  const addHolding = () => {
    setFormData((prev) => {
      return {
        ...prev,
        holdings: [
          ...prev.holdings,
          { symbol: '', name: '', quantity: '0', cost: '0', marketValue: '0', leverage: '1' },
        ],
      };
    });
  };

  const removeHolding = (index: number) => {
    setFormData((prev) => {
      const newHoldings = [...prev.holdings];
      newHoldings.splice(index, 1);
      return { ...prev, holdings: newHoldings };
    });
  };

  const updateHolding = (index: number, field: keyof Holding, value: string | number) => {
    setFormData((prev) => {
      const newHoldings = [...prev.holdings];
      newHoldings[index] = { ...newHoldings[index], [field]: value } as any;
      return { ...prev, holdings: newHoldings };
    });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validation = validateSnapshot(formData);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    setLoading(true);

    try {
      await onSubmit?.(formData.accountId, toSnapshot(formData));

      // Reset form
      setFormData(toSnapshotForm());
      setPreviousAmount(undefined);
      onClose?.();
    } catch (err) {
      const error = err as Error;
      setError(error.message || 'Failed to record snapshot');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    formData,
    updateFormData,
    previousAmount,
    isInvestment,
    addHolding,
    removeHolding,
    updateHolding,
    save,
    fetchingRate,
    fetchExchangeRate,
  };
};
