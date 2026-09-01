export const DEBT_PAYMENT_OPERATION_TYPE = 'DEBT_PAYMENT';
export const DEBT_PAYMENT_FINGERPRINT_VERSION = 1;

export interface DebtPaymentFingerprintInput {
  operationType: typeof DEBT_PAYMENT_OPERATION_TYPE;
  fingerprintVersion: typeof DEBT_PAYMENT_FINGERPRINT_VERSION;
  debtAccountId: string;
  totalPayment: number;
  paymentDate: Date;
  description?: string;
  explicitProjectId?: string | null;
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