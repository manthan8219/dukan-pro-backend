import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserNotificationType } from '../enums/user-notification-type.enum';

export class NotificationListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: UserNotificationType })
  type: UserNotificationType;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  body: string | null;

  @ApiPropertyOptional({ format: 'date-time' })
  readAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ format: 'uuid' })
  invitationId: string | null;

  @ApiPropertyOptional()
  dedupeKey: string | null;

  @ApiPropertyOptional()
  context: Record<string, unknown> | null;
}
