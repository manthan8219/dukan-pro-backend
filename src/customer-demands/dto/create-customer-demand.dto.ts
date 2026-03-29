import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCustomerDemandDto {
  @ApiProperty({ example: 'Repeat last order' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Same brands as receipt; deliver Saturday AM.' })
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  details: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  budgetHint?: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'POST /content first (kind IMAGE) for receipt',
  })
  @IsOptional()
  @IsUUID()
  receiptContentId?: string | null;

  @ApiPropertyOptional({
    description: 'Receipt total in paise (e.g. 250000 = ₹2500)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2_000_000_000)
  receiptOrderTotalMinor?: number | null;

  @ApiPropertyOptional({ description: 'Delivery pin for radius matching on publish' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  deliveryLatitude?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  deliveryLongitude?: number | null;
}
