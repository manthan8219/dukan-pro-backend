export enum UserNotificationType {
  /**
   * Generic invitation (demand board, future partner invites, etc.).
   * Use `context.invitationKind` (see InvitationKind) plus optional `invitationId`.
   */
  INVITATION = 'INVITATION',
  /**
   * @deprecated New rows should use INVITATION + context.invitationKind = DEMAND_SHOP.
   * Kept for existing DB rows and enum sync.
   */
  SELLER_DEMAND_INVITATION = 'SELLER_DEMAND_INVITATION',
  /** Customer: a shop submitted a quotation on their LIVE request */
  CUSTOMER_NEW_QUOTATION = 'CUSTOMER_NEW_QUOTATION',
  /** Seller: new order to fulfil (call when order pipeline creates an order) */
  SELLER_NEW_ORDER = 'SELLER_NEW_ORDER',
  /** Seller: monthly / periodic performance summary */
  SELLER_MONTHLY_INSIGHTS = 'SELLER_MONTHLY_INSIGHTS',
  /** Customer: order placed / status updates */
  CUSTOMER_ORDER_UPDATE = 'CUSTOMER_ORDER_UPDATE',
}
