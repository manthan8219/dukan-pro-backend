import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { KhataEntryKind } from '../enums/khata-entry-kind.enum';

export class CreateKhataEntryDto {
  @ApiProperty({ enum: KhataEntryKind })
  @IsEnum(KhataEntryKind)
  kind: KhataEntryKind;

  @ApiProperty({
    description: 'Positive amount in minor units (e.g. paise).',
    example: 15000,
  })
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  amountMinor: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ example: 'order' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  referenceType?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @ValidateIf((o: CreateKhataEntryDto) => o.referenceId != null)
  @IsUUID()
  referenceId?: string | null;

  @ApiPropertyOptional({
    description: 'Optional JSON payload for integrations.',
  })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  metadata?: Record<string, unknown> | null;
}
