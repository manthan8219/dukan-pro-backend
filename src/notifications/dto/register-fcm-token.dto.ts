import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterFcmTokenDto {
  @ApiProperty({ minLength: 10, maxLength: 512 })
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  token!: string;

  @ApiPropertyOptional({ example: 'android' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  platform?: string;
}
