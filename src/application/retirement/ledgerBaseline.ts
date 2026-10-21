import { netForLedgerCode } from '@/domains/retirement/calculators';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

const startOfYear = (year: number): Date => new Date(year, 0, 1);

/**
 * Fetches one code's net for one baseline year. The returned map carries its
 * year so callers can merge several years of the same code into one `netByYear`.
 */
export async function loadLedgerNetForYear(
  householdId: string,
  ledgerCodeId: string,
  year: number,
): Promise<Map<number, number>> {
  const transactions = await transactionRepository.listByDateRange(
    householdId,
    startOfYear(year),
    startOfYear(year + 1),
  );

  const net = netForLedgerCode(transactions, ledgerCodeId);
  const map = new Map<number, number>();
  if (net !== undefined) map.set(year, net);
  return map;
}
