import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationSummaryDto {
  @ApiProperty({ description: 'All unread notifications for this user' })
  totalUnread: number;

  @ApiProperty({
    description:
      'Unread items shown in the seller hub bell (invitations, orders, insights, …)',
  })
  sellerHubUnread: number;

  @ApiProperty({
    description:
      'Unread items shown in the customer app bell (quotations, order updates, …)',
  })
  customerAppUnread: number;

  @ApiProperty({
    description: 'Unread seller demand-board invitations (legacy + INVITATION/DEMAND_SHOP)',
  })
  sellerDemandInvitesUnread: number;

  @ApiProperty({
    description: 'Unread customer alerts (new quotations on your requests)',
  })
  customerNewQuotationsUnread: number;

  @ApiPropertyOptional({
    description: 'Per-type unread counts (string keys = UserNotificationType values)',
    type: 'object',
    additionalProperties: { type: 'number' },
  })
  unreadByType?: Record<string, number>;
}
