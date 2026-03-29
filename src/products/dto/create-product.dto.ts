import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Tata Salt 1kg' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional({ example: 'Grocery' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string | null;

  @ApiPropertyOptional({
    description: 'Default image URL when shops do not upload their own photo',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  defaultImageUrl?: string | null;

  @ApiPropertyOptional({
    description:
      'Extra names or words people use for this product (synonyms, regional names). Search matches these with the same substring rules as the main name.',
    type: [String],
    example: ['namak', 'table salt'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  searchTerms?: string[] | null;

  @ApiPropertyOptional({
    description: 'Barcode (EAN-13, UPC, etc.) — must be unique in catalog when set',
    example: '3017620422003',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  barcode?: string | null;
}
