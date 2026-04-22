import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BarcodeExternalSource } from '../open-food-facts.service';
import { Product } from '../entities/product.entity';

export type BarcodeResolveSource = 'local' | BarcodeExternalSource | 'unknown';

const ALL_SOURCES: BarcodeResolveSource[] = [
  'local',
  'openfoodfacts',
  'openbeautyfacts',
  'openproductsfacts',
  'openpetfoodfacts',
  'upcitemdb',
  'unknown',
];

export class BarcodeResolveResponseDto {
  @ApiProperty({ enum: ALL_SOURCES })
  source!: BarcodeResolveSource;

  @ApiProperty({ description: 'Normalized barcode used for lookup' })
  barcode!: string;

  @ApiPropertyOptional({
    type: () => Product,
    nullable: true,
    description: 'Catalog row when found locally or created from an external barcode source',
  })
  product!: Product | null;
}
