import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Listing row with resolved image URL for clients */
export class ShopProductResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  shopId: string;

  @ApiProperty({ format: 'uuid' })
  productId: string;

  @ApiProperty()
  quantity: number;

  @ApiPropertyOptional({ format: 'uuid' })
  imageContentId: string | null;

  @ApiProperty()
  unit: string;

  @ApiProperty({ description: 'Shop’s price in minor units (e.g. paise)' })
  priceMinor: number;

  @ApiProperty()
  minOrderQuantity: number;

  @ApiProperty()
  isListed: boolean;

  @ApiPropertyOptional()
  listingNotes: string | null;

  @ApiProperty({
    description:
      'Shop image if set, else catalog defaultImageUrl, else global fallback',
  })
  displayImageUrl: string;

  @ApiProperty()
  productName: string;

  @ApiPropertyOptional()
  productCategory: string | null;
}
