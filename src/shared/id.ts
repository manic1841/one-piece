/**
 * Platform-safe unique id (RFC 4122 v4 shape).
 *
 * `crypto.randomUUID` is only exposed in **secure contexts**. The app is served
 * over plain HTTP in some dev/preview setups (forwarded ports, LAN hosts), where
 * it is `undefined` and every caller throws `crypto.randomUUID is not a function`.
 * `crypto.getRandomValues` has no such restriction, so fall back to building a v4
 * UUID from it, then to `Math.random` for environments with no WebCrypto at all.
 */
export function newId(): string {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === 'function') return webCrypto.randomUUID();

  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
