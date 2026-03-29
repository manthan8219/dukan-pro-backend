import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductShopSummaryDto {
  @ApiProperty({ format: 'uuid' })
  shopId: string;

  @ApiProperty({ example: 'Sharma General Store' })
  shopDisplayName: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  isListed: boolean;

  @ApiProperty()
  unit: string;

  @ApiProperty({ description: 'Shop’s price in minor units (e.g. paise)' })
  priceMinor: number;
}
