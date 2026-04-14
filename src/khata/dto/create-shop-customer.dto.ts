import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateShopCustomerDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'When set, links this khata party to an existing platform user (one active row per shop per user).',
  })
  @IsOptional()
  @IsUUID()
  userId?: string | null;

  @ApiPropertyOptional({
    example: 'Ramesh Kumar',
    description: 'Display name; if omitted and userId is set, filled from the user profile.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}
