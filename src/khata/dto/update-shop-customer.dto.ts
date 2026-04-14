import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateShopCustomerDto {
  @ApiPropertyOptional({ example: 'Ramesh Kumar' })
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
