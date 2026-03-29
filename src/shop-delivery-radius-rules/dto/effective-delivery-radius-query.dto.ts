import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Max, Min } from 'class-validator';

export class EffectiveDeliveryRadiusQueryDto {
  @ApiProperty({ example: 2500, description: 'Order/cart total to evaluate' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(999999999.99)
  orderAmount: number;
}
