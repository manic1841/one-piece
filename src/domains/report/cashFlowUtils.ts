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
  const amount = debit - credit;
  if (amount === 0) return;

  if (code.startsWith(LEDGER_PREFIX.INCOME)) {
    if (amount < 0) addToMap(groups.operating.inflow, code, Math.abs(amount));
    else addToMap(groups.operating.outflow, code, amount);
  } else if (code.startsWith(LEDGER_PREFIX.EXPENSE)) {
    if (amount > 0) addToMap(groups.operating.outflow, code, amount);
    else addToMap(groups.operating.inflow, code, Math.abs(amount));
  } else if (
    code.startsWith(LEDGER_CODES.ASSET_INVESTMENT) ||
    code.startsWith(LEDGER_CODES.ASSET_PROPERTY)
  ) {
    if (amount > 0) addToMap(groups.investing.outflow, code, amount);
    else addToMap(groups.investing.inflow, code, Math.abs(amount));
  } else if (code.startsWith(LEDGER_PREFIX.LIABILITY) || code.startsWith(LEDGER_PREFIX.EQUITY)) {
    if (amount < 0) addToMap(groups.financing.inflow, code, Math.abs(amount));
    else addToMap(groups.financing.outflow, code, amount);
  }
};
