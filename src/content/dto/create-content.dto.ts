import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ContentKind } from '../content-kind.enum';

export class CreateContentDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  storageUrl: string;

  @ApiProperty({ enum: ContentKind })
  @IsEnum(ContentKind)
  kind: ContentKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  mimeType?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  originalFileName?: string | null;

  @ApiPropertyOptional({
    description: 'File size in bytes (string for bigint-safe JSON)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  byteSize?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ownerUserId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown> | null;
}
