import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from './shop.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Tiered delivery fee by order subtotal (minor units, e.g. paise).
 * At checkout, pick the row with the largest minOrderSubtotalMinor such that
 * subtotal >= minOrderSubtotalMinor. If none match, use shop.defaultDeliveryFeeMinor.
 * Free delivery (shop.offersFreeDelivery + threshold) overrides this to 0.
 */
@Entity('shop_delivery_fee_rules')
@Index(['shopId'])
export class ShopDeliveryFeeRule extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({
    description:
      'Order items subtotal threshold (minor units); this tier applies when subtotal >= this value',
    example: 0,
  })
  @Column({ type: 'int' })
  minOrderSubtotalMinor: number;

  @ApiProperty({
    description: 'Delivery fee charged when this tier applies (minor units)',
    example: 2500,
  })
  @Column({ type: 'int' })
  deliveryFeeMinor: number;
}
