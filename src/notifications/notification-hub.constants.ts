import { UserNotificationType } from './enums/user-notification-type.enum';

/** Subtypes for {@link UserNotificationType.INVITATION} (context.invitationKind). */
export const InvitationKind = {
  DEMAND_SHOP: 'DEMAND_SHOP',
} as const;

export type InvitationKindValue =
  (typeof InvitationKind)[keyof typeof InvitationKind];

/** Shown in seller shell (bell + seller-specific badges). */
export const SELLER_HUB_NOTIFICATION_TYPES: UserNotificationType[] = [
  UserNotificationType.INVITATION,
  UserNotificationType.SELLER_DEMAND_INVITATION,
  UserNotificationType.SELLER_NEW_ORDER,
  UserNotificationType.SELLER_MONTHLY_INSIGHTS,
];

/** Shown in customer shell. */
export const CUSTOMER_APP_NOTIFICATION_TYPES: UserNotificationType[] = [
  UserNotificationType.CUSTOMER_NEW_QUOTATION,
  UserNotificationType.CUSTOMER_ORDER_UPDATE,
];
