import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  shopProductId: string;

  @ApiProperty()
  unitPriceMinor: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  lineTotalMinor: number;

  @ApiProperty()
  productNameSnapshot: string;
}
