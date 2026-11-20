import { useFormContext } from 'react-hook-form';

type IntentFieldValues = {
  intent?: string;
  ledgerCode?: string;
};

/**
 * Selecting a *different* category invalidates the detail code picked for the
 * previous one. Without clearing it the stale code survives into the payload,
 * and the entry builder — which trusts `ledgerCode` whenever the mapping
 * delegates that side to the user — books the amount under the old code.
 * Re-confirming the same category keeps it.
 */
export const useIntentSelection = () => {
  const { getValues, setValue } = useFormContext<IntentFieldValues>();

  return (intent: string) => {
    const changed = getValues('intent') !== intent;
    setValue('intent', intent, { shouldValidate: true });
    if (changed && getValues('ledgerCode')) {
      setValue('ledgerCode', '', { shouldValidate: true });
    }
  };
};
