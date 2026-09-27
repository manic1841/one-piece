import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  AccountCategory,
  type AccountCreate,
  type AccountFormInput,
  AccountFormSchema,
  type AccountFormVM,
  CurrencyType,
  mapAccountVMToDomain,
} from '../viewmodels/account.vm';

/**
 * Controller for the account form (ADR-0064). Owns the RHF state; the page only
 * renders. Validation runs twice by design: the resolver drives field-level
 * display (`onTouched`), then an explicit `Schema.parse` over the raw form
 * values is the authoritative gate before the mapper and use case.
 */
export const useAccountForm = (onSubmit: (data: AccountCreate) => Promise<void>) => {
  const form = useForm<AccountFormInput, unknown, AccountFormVM>({
    resolver: zodResolver(AccountFormSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      category: AccountCategory.BANK,
      currency: CurrencyType.TWD,
      order: '',
    },
  });

  const submit = form.handleSubmit(() => {
    const parsed = AccountFormSchema.parse(form.getValues());
    return onSubmit(mapAccountVMToDomain(parsed));
  });

  return { form, submit };
};
