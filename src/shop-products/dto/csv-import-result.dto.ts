import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopProductResponseDto } from './shop-product-response.dto';

export class CsvImportWarningDto {
  @ApiProperty({ example: 3 })
  rowNumber: number;

  @ApiProperty({ example: 'Empty name — skipped.' })
  message: string;
}

export class CsvImportResultDto {
  @ApiProperty({ description: 'New shop listings created' })
  created: number;

  @ApiProperty({
    description: 'Existing listings updated (same catalog product)',
  })
  updated: number;

  @ApiProperty({ description: 'Rows skipped before DB (parse issues)' })
  skippedParse: number;

  @ApiPropertyOptional({
    type: [CsvImportWarningDto],
    description: 'Parse-time skips and messages',
  })
  parseWarnings?: CsvImportWarningDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Row-level failures during save (rare)',
  })
  errors?: string[];

  @ApiPropertyOptional({
    type: [ShopProductResponseDto],
    description: 'Listings touched by this import (created or updated)',
  })
  listings?: ShopProductResponseDto[];
}
