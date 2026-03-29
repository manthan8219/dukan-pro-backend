import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateShopProductDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  quantity: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Registered content id (kind IMAGE) for this shop’s photo',
  })
  @IsOptional()
  @ValidateIf((o: CreateShopProductDto) => o.imageContentId != null)
  @IsUUID()
  imageContentId?: string | null;

  @ApiPropertyOptional({ example: 'PIECE' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  unit?: string;

  @ApiProperty({
    description: 'Your selling price in minor units (e.g. 2500 = ₹25.00). Required per shop listing.',
    example: 2500,
  })
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  priceMinor: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minOrderQuantity?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isListed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  listingNotes?: string | null;
}
