import { netForLedgerCode } from '@/domains/retirement/calculators';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

const startOfYear = (year: number): Date => new Date(year, 0, 1);

/**
 * One full-year read, nets for every requested code.
 *
 * The read is the expensive part and depends only on the year, so callers group
 * their codes by baseline year instead of paying one identical full-year scan
 * per code.
 */
export async function loadLedgerNetsForYear(
  householdId: string,
  year: number,
  ledgerCodeIds: readonly string[],
): Promise<Map<string, number>> {
  const transactions = await transactionRepository.listByDateRange(
    householdId,
    startOfYear(year),
    startOfYear(year + 1),
  );

  const nets = new Map<string, number>();
  for (const id of ledgerCodeIds) {
    const net = netForLedgerCode(transactions, id);
    if (net !== undefined) nets.set(id, net);
  }
  return nets;
}
