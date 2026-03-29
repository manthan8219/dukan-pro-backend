/** Stored on demand_shop_invitations.quotedLineItems when seller attaches SKUs to a quote. */
export type QuotedLineItemSnapshot = {
  shopProductId: string;
  quantity: number;
  productNameSnapshot: string;
  unitPriceMinor: number;
  unit: string;
};

export function isQuotedLineItemSnapshot(x: unknown): x is QuotedLineItemSnapshot {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.shopProductId === 'string' &&
    typeof o.quantity === 'number' &&
    Number.isFinite(o.quantity) &&
    o.quantity >= 1 &&
    typeof o.productNameSnapshot === 'string' &&
    typeof o.unitPriceMinor === 'number' &&
    typeof o.unit === 'string'
  );
}

export function parseQuotedLineItems(raw: unknown | null): QuotedLineItemSnapshot[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  return raw.filter(isQuotedLineItemSnapshot);
}
