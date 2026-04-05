import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateShopDeliveryRadiusRuleDto } from '../../shop-delivery-radius-rules/dto/create-shop-delivery-radius-rule.dto';
import { UpdateSellerProfileDto } from '../../seller-profile/dto/update-seller-profile.dto';
import { CreateShopDto } from '../../shops/dto/create-shop.dto';

export class ShopPhotoAttachmentDto {
  @ApiProperty({
    description:
      'Content row id (upload bytes via storage presign + register content first, then pass id here)',
    format: 'uuid',
  })
  @IsUUID()
  contentId: string;

  @ApiPropertyOptional({
    description:
      'Gallery order; lower first. If omitted, order follows the array index after sorting by sortOrder.',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export class ShopDeliveryFeeRuleInputDto {
  @ApiProperty({
    description:
      'Order subtotal threshold (minor units, e.g. paise); this tier applies when subtotal >= this',
    example: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderSubtotalMinor: number;

  @ApiProperty({
    description: 'Delivery fee charged for this tier (minor units)',
    example: 2500,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryFeeMinor: number;
}

export class ShopDeliverySlotInputDto {
  @ApiProperty({
    description: '0 = Sunday … 6 = Saturday (same as JS Date#getDay)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday: number;

  @ApiProperty({
    description: 'Start of window, 24h local time HH:mm',
    example: '09:00',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startLocal: string;

  @ApiProperty({
    description:
      'End of window, 24h local time HH:mm (must be after startLocal same day)',
    example: '12:00',
  })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endLocal: string;

  @ApiPropertyOptional({
    description: 'Multiple windows on the same weekday: lower sorts first',
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export class OnboardShopDto extends CreateShopDto {
  @ApiPropertyOptional({
    type: () => [ShopDeliverySlotInputDto],
    description:
      'Store open hours by weekday; startLocal = opens, endLocal = closes (same HH:mm rules as deliverySlots)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ShopDeliverySlotInputDto)
  openingHours?: ShopDeliverySlotInputDto[];

  @ApiPropertyOptional({
    type: () => [CreateShopDeliveryRadiusRuleDto],
    description:
      'Optional per–min-order delivery radius tiers (same model as POST …/delivery-radius-rules)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateShopDeliveryRadiusRuleDto)
  deliveryRadiusRules?: CreateShopDeliveryRadiusRuleDto[];

  @ApiPropertyOptional({
    type: () => [ShopDeliverySlotInputDto],
    description: 'Recurring local delivery windows by weekday',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ShopDeliverySlotInputDto)
  deliverySlots?: ShopDeliverySlotInputDto[];

  @ApiPropertyOptional({
    type: () => [ShopPhotoAttachmentDto],
    description: 'Shop gallery images (content ids after upload)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ShopPhotoAttachmentDto)
  shopPhotos?: ShopPhotoAttachmentDto[];

  @ApiPropertyOptional({
    type: () => [ShopDeliveryFeeRuleInputDto],
    description:
      'Tiered delivery fees by order subtotal (minor units). Pick the tier with the greatest minOrderSubtotalMinor that is <= subtotal; if none, use shop.defaultDeliveryFeeMinor from orderingDelivery. Free delivery policy overrides to 0.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ShopDeliveryFeeRuleInputDto)
  deliveryFeeRules?: ShopDeliveryFeeRuleInputDto[];

  @ApiPropertyOptional({
    type: () => UpdateSellerProfileDto,
    description:
      'Ensures a seller_profiles row exists and applies these fields (plan, trial, …)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSellerProfileDto)
  sellerProfile?: UpdateSellerProfileDto;
}
