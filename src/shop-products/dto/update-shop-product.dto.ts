import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateShopProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  quantity?: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Set null to clear shop photo and use catalog default',
  })
  @IsOptional()
  @ValidateIf((o: UpdateShopProductDto) => o.imageContentId != null)
  @IsUUID()
  imageContentId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  unit?: string;

  @ApiPropertyOptional({
    description: 'Update selling price (minor units, min 1). Cannot be removed once set.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  priceMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isListed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  listingNotes?: string | null;
}
