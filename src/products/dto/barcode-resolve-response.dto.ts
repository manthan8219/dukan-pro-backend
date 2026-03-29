import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Product } from '../entities/product.entity';

export type BarcodeResolveSource = 'local' | 'openfoodfacts' | 'unknown';

export class BarcodeResolveResponseDto {
  @ApiProperty({ enum: ['local', 'openfoodfacts', 'unknown'] })
  source!: BarcodeResolveSource;

  @ApiProperty({ description: 'Normalized barcode used for lookup' })
  barcode!: string;

  @ApiPropertyOptional({
    type: () => Product,
    nullable: true,
    description: 'Catalog row when found locally or created from Open Food Facts',
  })
  product!: Product | null;
}
