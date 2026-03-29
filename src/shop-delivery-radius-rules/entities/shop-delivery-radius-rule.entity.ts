import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Per-shop tier: when cart/order amount is at least minOrderAmount,
 * delivery/service is offered up to maxServiceRadiusKm.
 * Evaluation picks the matching row with the highest minOrderAmount.
 */
@Entity('shop_delivery_radius_rules')
@Index(['shopId'])
export class ShopDeliveryRadiusRule extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({
    description:
      'Minimum order value (same currency as your orders; e.g. INR rupees)',
    example: '2000.00',
  })
  @Column({ type: 'numeric', precision: 14, scale: 2 })
  minOrderAmount: string;

  @ApiProperty({
    description: 'Maximum service/delivery radius when this tier applies (km)',
    example: 20,
  })
  @Column({ type: 'double precision' })
  maxServiceRadiusKm: number;
}
