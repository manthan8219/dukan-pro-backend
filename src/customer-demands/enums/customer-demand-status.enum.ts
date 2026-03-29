export enum CustomerDemandStatus {
  /** Customer is still editing; not visible on seller boards */
  DRAFT = 'DRAFT',
  /** Published — sellers can see and bid */
  LIVE = 'LIVE',
  /** Customer accepted an offer (reserved for future bid linkage) */
  AWARDED = 'AWARDED',
  /** Ended without award or cancelled */
  CLOSED = 'CLOSED',
}
