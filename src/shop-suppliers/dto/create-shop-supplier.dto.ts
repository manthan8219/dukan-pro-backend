import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateShopSupplierDto {
  @ApiProperty({ example: 'Fresh Farms Co.' })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  name: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  address?: string;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  categories?: string[];

  @ApiPropertyOptional({ description: 'Minor units (paise); default 0' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  amountOwedMinor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @ApiPropertyOptional({
    description: 'Local id from the app; duplicate POST returns existing row',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientLocalId?: string;
}
