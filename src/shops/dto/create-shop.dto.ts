import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class CoordinatesDto {
  @ApiPropertyOptional({ example: 19.076 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @ApiPropertyOptional({ example: 72.8777 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;
}

export class StructuredAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  line1?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  stateRegion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  postalCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string | null;
}

export class LocationDto {
  @ApiPropertyOptional({ type: () => CoordinatesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;

  @ApiPropertyOptional({
    example: 'Near City Mall, Andheri West, Mumbai',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  addressText?: string | null;

  @ApiPropertyOptional({ type: () => StructuredAddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => StructuredAddressDto)
  structured?: StructuredAddressDto;
}

export class ShopOfferingDto {
  @ApiProperty({ example: 'RETAIL' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  shopType: string;

  @ApiProperty({
    type: [String],
    example: ['Groceries', 'Staples'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  dealIn: string[];

  @ApiProperty({ example: 5, description: 'Service radius in kilometres' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(20000)
  serviceRadiusKm: number;
}

export class ContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  website?: string | null;
}

export class GstDto {
  @ApiProperty({ default: false })
  @IsBoolean()
  isGstApplicable: boolean;

  @ApiPropertyOptional({ description: 'Required when isGstApplicable is true' })
  @ValidateIf((o: GstDto) => o.isGstApplicable === true)
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  gstNo?: string | null;
}

export class CreateShopDto {
  @ApiProperty({ example: 'Sharma General Store' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'Sharma Store' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  displayName: string;

  @ApiProperty({ example: 'Sharma Retail Pvt Ltd' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  billingName: string;

  @ApiProperty({ type: () => LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ type: () => ShopOfferingDto })
  @ValidateNested()
  @Type(() => ShopOfferingDto)
  offering: ShopOfferingDto;

  @ApiPropertyOptional({ type: () => ContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactDto)
  contact?: ContactDto;

  @ApiProperty({ type: () => GstDto })
  @ValidateNested()
  @Type(() => GstDto)
  gst: GstDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
