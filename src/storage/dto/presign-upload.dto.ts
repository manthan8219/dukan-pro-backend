import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export enum PresignUploadVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export class PresignUploadDto {
  @ApiProperty({ enum: PresignUploadVisibility })
  @IsEnum(PresignUploadVisibility)
  visibility: PresignUploadVisibility;

  @ApiProperty({ example: 'receipt.jpg' })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  fileName: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  contentType: string;
}
