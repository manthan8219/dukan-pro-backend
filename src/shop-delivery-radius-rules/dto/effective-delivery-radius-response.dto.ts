import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EffectiveDeliveryRadiusResponseDto {
  @ApiProperty()
  orderAmount: number;

  @ApiPropertyOptional({ format: 'uuid' })
  matchedRuleId: string | null;

  @ApiPropertyOptional({
    description: 'Radius from the matched tier (km); null if no tier matched',
  })
  maxServiceRadiusKmFromRule: number | null;

  @ApiProperty({
    description: 'Fallback from shop.offering.serviceRadiusKm',
  })
  shopDefaultServiceRadiusKm: number;

  @ApiProperty({
    description:
      'Radius to use: matched tier radius if any, otherwise shop default',
  })
  effectiveMaxServiceRadiusKm: number;
}
