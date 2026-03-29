import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { UserNotificationType } from '../enums/user-notification-type.enum';

export class MarkNotificationsReadDto {
  @ApiPropertyOptional({
    description: 'Mark every unread notification for this user',
  })
  @IsOptional()
  @IsBoolean()
  all?: boolean;

  @ApiPropertyOptional({
    enum: UserNotificationType,
    isArray: true,
    description: 'Mark unread rows matching these types only',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(UserNotificationType, { each: true })
  types?: UserNotificationType[];

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'For customer quotation alerts: mark unread notifications tied to this demand',
  })
  @IsOptional()
  @IsUUID()
  demandId?: string;
}
