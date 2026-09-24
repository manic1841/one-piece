/**
 * 白名單比對規則（純函式）。
 *
 * 抽自 `isUserAuthorizedUseCase` 原本內聯的比對：讀取白名單是 IO（use case 的職責），
 * 「這個 email 在不在名單裡」是純規則（domain 的職責）。
 */
export const normalizeWhitelistEmail = (email: string): string => email.toLowerCase().trim();

export const isEmailWhitelisted = (emails: readonly string[], email: string | null): boolean => {
  if (!email) return false;
  return emails.includes(normalizeWhitelistEmail(email));
};
