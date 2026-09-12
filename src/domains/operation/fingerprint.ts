export const DEBT_PAYMENT_OPERATION_TYPE = 'DEBT_PAYMENT';
export const DEBT_PAYMENT_FINGERPRINT_VERSION = 1;
export const TRANSACTION_WITH_ALLOCATION_OPERATION_TYPE = 'TRANSACTION_WITH_ALLOCATION';
export const TRANSACTION_WITH_ALLOCATION_FINGERPRINT_VERSION = 1;

export interface DebtPaymentFingerprintInput {
  operationType: typeof DEBT_PAYMENT_OPERATION_TYPE;
  fingerprintVersion: typeof DEBT_PAYMENT_FINGERPRINT_VERSION;
  debtAccountId: string;
  totalPayment: number;
  paymentDate: Date;
  description?: string;
  explicitProjectId?: string | null;
}

export interface TransactionWithAllocationFingerprintInput {
  transaction: {
    date: Date;
    description?: string;
    intent?: string;
    intentType?: string;
    amount?: number;
    projectId?: string | null;
    fromProjectId?: string | null;
    toProjectId?: string | null;
    debtAccountId?: string | null;
    entries: {
      ledgerCode: string;
      accountId?: string;
      debit: number;
      credit: number;
      investmentDetail?: {
        assetId: string;
        quantity: number;
        price: number;
      };
    }[];
  };
  allocation: {
    direction: 'INCOME' | 'EXPENSE';
    items: { projectId: string; percentage: number }[];
  };
}

export const normalizeDescription = (description?: string): string =>
  (description ?? '').trim().replace(/\s+/g, ' ');

export const toCanonicalPaymentDate = (paymentDate: Date): string => {
  if (!Number.isFinite(paymentDate.getTime())) {
    throw new Error('INVALID_PAYMENT_DATE: payment date must be valid');
  }

  const year = paymentDate.getFullYear();
  const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
  const day = String(paymentDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toCanonicalPayload = (input: DebtPaymentFingerprintInput) => ({
  operationType: input.operationType,
  fingerprintVersion: input.fingerprintVersion,
  debtAccountId: input.debtAccountId,
  totalPayment: input.totalPayment,
  canonicalPaymentDate: toCanonicalPaymentDate(input.paymentDate),
  normalizedDescription: normalizeDescription(input.description),
  explicitProjectId: input.explicitProjectId ?? null,
});

export async function createDebtPaymentFingerprint(
  input: DebtPaymentFingerprintInput,
): Promise<string> {
  const canonicalPayload = JSON.stringify(toCanonicalPayload(input));
  const encodedPayload = new TextEncoder().encode(canonicalPayload);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encodedPayload);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const toCanonicalTransactionWithAllocationPayload = (
  input: TransactionWithAllocationFingerprintInput,
) => ({
  operationType: TRANSACTION_WITH_ALLOCATION_OPERATION_TYPE,
  fingerprintVersion: TRANSACTION_WITH_ALLOCATION_FINGERPRINT_VERSION,
  transaction: {
    date: toCanonicalPaymentDate(input.transaction.date),
    description: normalizeDescription(input.transaction.description),
    intent: normalizeDescription(input.transaction.intent),
    intentType: input.transaction.intentType ?? null,
    amount: input.transaction.amount ?? null,
    projectId: input.transaction.projectId ?? null,
    fromProjectId: input.transaction.fromProjectId ?? null,
    toProjectId: input.transaction.toProjectId ?? null,
    debtAccountId: input.transaction.debtAccountId ?? null,
    entries: input.transaction.entries.map((entry) => ({
      ledgerCode: entry.ledgerCode,
      accountId: entry.accountId ?? null,
      debit: entry.debit,
      credit: entry.credit,
      investmentDetail: entry.investmentDetail ?? null,
    })),
  },
  allocation: {
    direction: input.allocation.direction,
    items: input.allocation.items.map((item) => ({
      projectId: item.projectId,
      percentage: item.percentage,
    })),
  },
});

export async function createTransactionWithAllocationFingerprint(
  input: TransactionWithAllocationFingerprintInput,
): Promise<string> {
  const canonicalPayload = JSON.stringify(toCanonicalTransactionWithAllocationPayload(input));
  const encodedPayload = new TextEncoder().encode(canonicalPayload);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encodedPayload);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}