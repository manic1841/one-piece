import { LEDGER_CODES, LEDGER_PREFIX } from '@/domains/ledger/constants';

export type CashFlowGroups = {
  operating: { inflow: Map<string, number>; outflow: Map<string, number> };
  investing: { inflow: Map<string, number>; outflow: Map<string, number> };
  financing: { inflow: Map<string, number>; outflow: Map<string, number> };
};

const addToMap = (map: Map<string, number>, key: string, value: number) => {
  if (value === 0) return;
  map.set(key, (map.get(key) || 0) + value);
};

export const categorizeLedgerEntry = (
  entry: { ledgerCode: string; debit: number; credit: number },
  groups: CashFlowGroups,
) => {
  const { ledgerCode: code, debit, credit } = entry;
  // Signed amount: positive = debit, negative = credit. The normal side decides
  // which bucket is the "primary" flow; the sign only tells us if it reverses.
  const signed = debit - credit;
  if (signed === 0) return;

  if (code.startsWith(LEDGER_PREFIX.INCOME)) {
    // Income is credit-normal: credit flows in, a debit reverses it out.
    if (signed < 0) addToMap(groups.operating.inflow, code, -signed);
    else addToMap(groups.operating.outflow, code, signed);
  } else if (code.startsWith(LEDGER_PREFIX.EXPENSE)) {
    // Expense is debit-normal: debit flows out, a credit reverses it in.
    if (signed > 0) addToMap(groups.operating.outflow, code, signed);
    else addToMap(groups.operating.inflow, code, -signed);
  } else if (
    code.startsWith(LEDGER_CODES.ASSET_INVESTMENT) ||
    code.startsWith(LEDGER_CODES.ASSET_PROPERTY)
  ) {
    // Asset purchase is debit-normal: debit flows out, a credit (sale) flows in.
    if (signed > 0) addToMap(groups.investing.outflow, code, signed);
    else addToMap(groups.investing.inflow, code, -signed);
  } else if (code.startsWith(LEDGER_PREFIX.LIABILITY) || code.startsWith(LEDGER_PREFIX.EQUITY)) {
    // Liability/equity are credit-normal: credit flows in, a debit flows out.
    if (signed < 0) addToMap(groups.financing.inflow, code, -signed);
    else addToMap(groups.financing.outflow, code, signed);
  }
};
