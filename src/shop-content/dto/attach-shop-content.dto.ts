import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class AttachShopContentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  contentId: string;

  @ApiPropertyOptional({
    description:
      'If omitted, appends after current last image (upload order). If set, shifts existing links at or after this index by +1.',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}
