/**
 * Normalized barcode for storage and lookup (compact, 6–32 chars, alphanumeric).
 */
export function normalizeBarcode(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const compact = raw.trim().replace(/\s+/g, '');
  if (compact.length < 6 || compact.length > 32) return null;
  if (!/^[0-9A-Za-z]+$/.test(compact)) return null;
  return compact;
}
