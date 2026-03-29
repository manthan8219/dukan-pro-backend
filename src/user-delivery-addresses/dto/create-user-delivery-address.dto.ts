import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DeliveryAddressTag } from '../enums/delivery-address-tag.enum';

export class CreateUserDeliveryAddressDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName: string;

  @ApiProperty({ maxLength: 32 })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  phone: string;

  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  line1: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  line2?: string;

  @ApiPropertyOptional({ maxLength: 300 })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  landmark?: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  city: string;

  @ApiProperty({ description: '6-digit PIN' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  pin: string;

  @ApiProperty({ enum: DeliveryAddressTag })
  @IsEnum(DeliveryAddressTag)
  tag: DeliveryAddressTag;

  @ApiPropertyOptional({
    maxLength: 120,
    description: 'Required when tag is other; ignored for home/office (label is fixed).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({
    description:
      'If true, this row becomes the default and others are cleared. First address for the user is always default.',
  })
  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;
}
