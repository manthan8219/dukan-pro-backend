import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShopSupplierResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  shopId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  phone: string;

  @ApiPropertyOptional()
  email: string | null;

  @ApiPropertyOptional()
  address: string | null;

  @ApiProperty({ type: [String] })
  categories: string[];

  @ApiProperty()
  amountOwedMinor: number;

  @ApiPropertyOptional()
  note: string | null;

  @ApiPropertyOptional()
  clientLocalId: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
