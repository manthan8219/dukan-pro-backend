import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class CreateShopDeliveryRadiusRuleDto {
  @ApiProperty({
    example: 2000,
    description:
      'Minimum order total for this tier (major currency units, e.g. INR)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999999999.99)
  minOrderAmount: number;

  @ApiProperty({
    example: 20,
    description: 'Max delivery/service radius when this tier applies (km)',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(20000)
  maxServiceRadiusKm: number;
}
