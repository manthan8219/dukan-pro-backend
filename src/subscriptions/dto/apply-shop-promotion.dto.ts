import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class ApplyShopPromotionDto {
  @ApiProperty({ example: 'LAUNCH50' })
  @IsString()
  promotionalCouponCode: string;

  @ApiPropertyOptional({ description: '0–100 percent off' })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(100)
  promotionalDiscountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  promotionMetadata?: Record<string, unknown>;
}
