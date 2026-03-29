/** Matches customer app: free delivery when basket subtotal (minor units) is at or above this. */
export const FREE_DELIVERY_THRESHOLD_MINOR = 499 * 100;

/** Flat delivery fee in minor units (e.g. paise) when below threshold. */
export const DEFAULT_DELIVERY_FEE_MINOR = 40 * 100;

/** Listed SKUs at or below this quantity count as low stock on the seller dashboard. */
export const LOW_STOCK_QTY_THRESHOLD = 5;
