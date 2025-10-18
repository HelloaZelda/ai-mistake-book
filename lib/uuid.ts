const hasCrypto = typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined';

export function generateId(): string {
  if (hasCrypto && 'randomUUID' in globalThis.crypto) {
    return globalThis.crypto.randomUUID();
  }

  const random = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
    .toString(36)
    .padStart(10, '0');
  return `id-${Date.now().toString(36)}-${random}`;
}
