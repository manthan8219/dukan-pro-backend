import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { SubscriptionBillingPeriod } from '../enums/subscription-billing-period.enum';

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'pro_monthly' })
  @IsString()
  @Length(1, 64)
  code: string;

  @ApiProperty({ example: 'Pro (monthly)' })
  @IsString()
  @Length(1, 200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  trialDays?: number;

  @ApiProperty({ enum: SubscriptionBillingPeriod })
  @IsEnum(SubscriptionBillingPeriod)
  billingPeriod: SubscriptionBillingPeriod;

  @ApiPropertyOptional({
    description: 'Price in minor units; omit for free / custom pricing',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceAmountMinor?: number;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
