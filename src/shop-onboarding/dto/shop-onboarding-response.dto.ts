import { ApiProperty } from '@nestjs/swagger';
import { SellerProfile } from '../../seller-profile/entities/seller-profile.entity';
import { Shop } from '../../shops/entities/shop.entity';

export class ShopOnboardingResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Primary shop row id (same as shop.id); use this in the app for all shop-scoped API calls',
  })
  shopId: string;

  @ApiProperty({ type: () => Shop })
  shop: Shop;

  @ApiProperty({
    description: 'Ids of created shop_delivery_radius_rules rows',
    type: [String],
  })
  deliveryRadiusRuleIds: string[];

  @ApiProperty({
    description: 'Ids of created shop_delivery_slots rows',
    type: [String],
  })
  deliverySlotIds: string[];

  @ApiProperty({
    description: 'Ids of created shop_content_links rows',
    type: [String],
  })
  shopContentLinkIds: string[];

  @ApiProperty({
    description: 'Ids of created shop_opening_hours rows',
    type: [String],
  })
  openingHourIds: string[];

  @ApiProperty({
    description: 'Ids of created shop_delivery_fee_rules rows',
    type: [String],
  })
  deliveryFeeRuleIds: string[];

  @ApiProperty({ type: () => SellerProfile })
  sellerProfile: SellerProfile;
}
