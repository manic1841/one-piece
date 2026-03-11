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
import { useAccountCmds } from '@/hooks/useAccountCmds';
import { exchangeRateService } from '@/services/exchangeRateService';

export const useAccountSnapshotForm = (
  householdId?: string,
  selectedAccount?: Account,
  initialData?: AccountSnapshot,
  onSubmit?: (accountId: string, snapshot: AccountSnapshotCreate) => Promise<void>,
  onClose?: () => void,
) => {
  const { getPreviousSnapshot } = useAccountCmds(householdId);

  const [formData, setFormData] = useState<AccountSnapshotFormData>(() =>
    toSnapshotForm(selectedAccount?.id, selectedAccount?.currency, initialData),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingRate, setFetchingRate] = useState(false);
  const [previousAmount, setPreviousAmount] = useState<number | undefined>(undefined);

  const isInvestment = selectedAccount?.category === AccountCategory.INVESTMENT;

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
      try {
        const snapshot = await getPreviousSnapshot(accountId, year, month);
        setPreviousAmount(snapshot?.amount);

        if (!initialData && snapshot?.holdings && snapshot.holdings.length > 0) {
          setFormData((prev) => {
            if (prev.holdings.length === 0) {
              return {
                ...prev,
                holdings: snapshot.holdings!.map((h) => ({
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
    [getPreviousSnapshot, initialData],
  );

  useEffect(() => {
    if (formData?.accountId && formData?.year && formData?.month) {
      loadPreviousAmount(formData.accountId, parseInt(formData.year), parseInt(formData.month));
    }
  }, [formData?.accountId, formData?.year, formData?.month, loadPreviousAmount]);

  const fetchExchangeRate = useCallback(async () => {
    if (!formData.currency || formData.currency === 'TWD') return;
    setFetchingRate(true);
    setError('');
    try {
      const rate = await exchangeRateService.getLatestRate(formData.currency, 'TWD');

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
    } finally {
      setFetchingRate(false);
    }
  }, [formData.currency]);

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
      const totalValue = formData?.holdings.reduce((sum, h) => sum + parseFloat(h.marketValue), 0);
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
      newHoldings[index] = { ...newHoldings[index], [field]: value };
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
