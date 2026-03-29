import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Public summary for customers: shop is within delivery radius of the given point. */
export class ShopNearbySummaryDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Sharma Store' })
  displayName: string;

  @ApiProperty({ example: 'Sharma General Store' })
  name: string;

  @ApiProperty({
    description:
      'Straight-line distance from the query point to the shop pin (km)',
    example: 1.25,
  })
  distanceKm: number;

  @ApiProperty({
    description:
      'Max delivery distance (km) for this shop at the given order amount — same logic as GET .../delivery-radius-rules/effective',
  })
  effectiveMaxServiceRadiusKm: number;

  @ApiPropertyOptional()
  addressText: string | null;

  @ApiPropertyOptional({ example: 'Mumbai' })
  city: string | null;

  @ApiProperty({ example: 'RETAIL' })
  shopType: string;

  @ApiProperty({ type: [String], example: ['Groceries', 'Staples'] })
  dealIn: string[];

  @ApiPropertyOptional({
    description: 'Null when there are no ratings yet',
    example: 4.25,
  })
  averageRating: number | null;

  @ApiProperty({ example: 12 })
  ratingCount: number;
}
