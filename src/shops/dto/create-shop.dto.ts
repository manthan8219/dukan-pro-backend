import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
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

/** Order acceptance limits + delivery fee defaults (amounts in minor units, e.g. paise). */
export class ShopOrderingDeliveryPolicyDto {
  @ApiPropertyOptional({
    description: 'Minimum order subtotal the shop accepts (minor units)',
    example: 9900,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderAmountMinor?: number | null;

  @ApiPropertyOptional({
    description: 'Maximum order subtotal cap; omit or null for no maximum',
    example: 5000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxOrderAmountMinor?: number | null;

  @ApiPropertyOptional({
    default: false,
    description: 'Whether the shop offers free delivery (see freeDeliveryMinOrderAmountMinor)',
  })
  @IsOptional()
  @IsBoolean()
  offersFreeDelivery?: boolean;

  @ApiPropertyOptional({
    description:
      'When offersFreeDelivery is true: free if subtotal >= this (minor). Null means all orders get free delivery.',
    example: 49900,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  freeDeliveryMinOrderAmountMinor?: number | null;

  @ApiPropertyOptional({
    default: 0,
    description:
      'Delivery fee when no delivery-fee tier matches (minor units); see shop_delivery_fee_rules',
    example: 2500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  defaultDeliveryFeeMinor?: number;
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

  @ApiPropertyOptional({ type: () => ShopOrderingDeliveryPolicyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShopOrderingDeliveryPolicyDto)
  orderingDelivery?: ShopOrderingDeliveryPolicyDto;

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
