import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class StartShopTrialDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  subscriptionPlanId: string;

  @ApiPropertyOptional({
    description:
      'Override plan default trial length (days). If omitted, uses subscription plan trialDays.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  trialDaysOverride?: number;

  @ApiPropertyOptional({
    description: 'Anchor for trial start; defaults to now',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  trialStartedAt?: Date;

  @ApiPropertyOptional({ example: 'WELCOME14' })
  @IsOptional()
  @IsString()
  promotionalCouponCode?: string;
}
