import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from './shop.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Recurring delivery window in the shop's local timezone (wall clock).
 * `weekday` follows JavaScript convention: 0 = Sunday … 6 = Saturday.
 */
@Entity('shop_delivery_slots')
@Index(['shopId', 'weekday', 'sortOrder'])
export class ShopDeliverySlot extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({
    description: '0 = Sunday, 1 = Monday, … 6 = Saturday (same as JS Date#getDay)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @Column({ type: 'smallint' })
  weekday: number;

  @ApiProperty({
    description: 'Start time (local), HH:mm:ss',
    example: '09:00:00',
  })
  @Column({ type: 'time' })
  startLocal: string;

  @ApiProperty({
    description: 'End time (local), HH:mm:ss',
    example: '12:00:00',
  })
  @Column({ type: 'time' })
  endLocal: string;

  @ApiProperty({
    description: 'Order multiple windows on the same weekday (lower first)',
    example: 0,
  })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
