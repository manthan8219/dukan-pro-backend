import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserNotificationType } from './enums/user-notification-type.enum';
import { MarkNotificationsReadDto } from './dto/mark-notifications-read.dto';
import { NotificationListItemDto } from './dto/notification-list-item.dto';
import { NotificationSummaryDto } from './dto/notification-summary.dto';
import { NotificationsService } from './notifications.service';

function parseTypesQuery(raw?: string): UserNotificationType[] | undefined {
  if (!raw || raw.trim() === '') {
    return undefined;
  }
  const parts = raw.split(',').map((s) => s.trim());
  const allowed = new Set(Object.values(UserNotificationType));
  const out = parts.filter((p): p is UserNotificationType =>
    allowed.has(p as UserNotificationType),
  );
  return out.length ? out : undefined;
}

@ApiTags('notifications')
@Controller('users/:userId/notifications')
export class UserNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Unread notification counts (badges)',
    description:
      'Includes totalUnread, sellerHubUnread / customerAppUnread for shell bells, plus legacy demand/quotation splits.',
  })
  @ApiOkResponse({ type: NotificationSummaryDto })
  summary(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<NotificationSummaryDto> {
    return this.notificationsService.getSummary(userId);
  }

  @Get()
  @ApiOperation({
    summary: 'List notifications (e.g. bell popover)',
    description:
      'Defaults to unread only. Pass comma-separated UserNotificationType values to filter (e.g. INVITATION, SELLER_NEW_ORDER).',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({
    name: 'types',
    required: false,
    description: 'Comma-separated UserNotificationType values',
  })
  @ApiOkResponse({ type: NotificationListItemDto, isArray: true })
  list(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('limit', new DefaultValuePipe(25), ParseIntPipe) limit: number,
    @Query('unreadOnly', new DefaultValuePipe(true), ParseBoolPipe)
    unreadOnly: boolean,
    @Query('types') typesRaw?: string,
  ): Promise<NotificationListItemDto[]> {
    return this.notificationsService.listForUser(userId, {
      limit,
      unreadOnly,
      types: parseTypesQuery(typesRaw),
    });
  }

  @Post('mark-read')
  @ApiOperation({
    summary: 'Mark notifications as read',
    description:
      'Use types: [CUSTOMER_NEW_QUOTATION] when the customer opens Requests; omit or all: true to clear everything unread.',
  })
  @ApiOkResponse({ type: NotificationSummaryDto })
  markRead(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: MarkNotificationsReadDto,
  ): Promise<NotificationSummaryDto> {
    return this.notificationsService.markRead(userId, dto);
  }

  @Post(':notificationId/read')
  @ApiOperation({ summary: 'Mark one notification as read (e.g. after opening from bell)' })
  @ApiOkResponse({ type: NotificationSummaryDto })
  markOneRead(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<NotificationSummaryDto> {
    return this.notificationsService.markOneRead(userId, notificationId);
  }
}
