import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  defaultImageUrl?: string | null;

  @ApiPropertyOptional({
    description: 'Replace aliases; send null or [] to clear',
    type: [String],
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o: UpdateProductDto) => o.searchTerms != null)
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  searchTerms?: string[] | null;

  @ApiPropertyOptional({
    description: 'Set or clear catalog barcode (null to remove)',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o: UpdateProductDto) => o.barcode != null)
  @IsString()
  @MaxLength(32)
  barcode?: string | null;
}
