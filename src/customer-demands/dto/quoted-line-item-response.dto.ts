import { ApiProperty } from '@nestjs/swagger';

export class QuotedLineItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  shopProductId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  productNameSnapshot: string;

  @ApiProperty({ description: 'Unit price in minor units at quote time (display only).' })
  unitPriceMinor: number;

  @ApiProperty()
  unit: string;
}
