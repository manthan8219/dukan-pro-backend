import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ShopSubscriptionStatus } from '../enums/shop-subscription-status.enum';

export class UpsertShopSubscriptionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subscriptionPlanId: string;

  @ApiPropertyOptional({ enum: ShopSubscriptionStatus })
  @IsOptional()
  @IsEnum(ShopSubscriptionStatus)
  status?: ShopSubscriptionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  trialStartedAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  trialEndsAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  currentPeriodStart?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  currentPeriodEnd?: Date;

  @ApiPropertyOptional({ example: 'LAUNCH50' })
  @IsOptional()
  @IsString()
  promotionalCouponCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  promotionAppliedAt?: Date;

  @ApiPropertyOptional({ description: '0–100' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  promotionalDiscountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  promotionMetadata?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalBillingSubscriptionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  canceledAt?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
