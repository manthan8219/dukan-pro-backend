import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from './shop.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * When the storefront is open for business (local wall clock).
 * `weekday` follows JS: 0 = Sunday … 6 = Saturday.
 */
@Entity('shop_opening_hours')
@Index(['shopId', 'weekday', 'sortOrder'])
export class ShopOpeningHour extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({
    description: '0 = Sunday, … 6 = Saturday',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @Column({ type: 'smallint' })
  weekday: number;

  @ApiProperty({ example: '09:00:00', description: 'Opens at (local time)' })
  @Column({ type: 'time' })
  opensLocal: string;

  @ApiProperty({ example: '21:00:00', description: 'Closes at (local time)' })
  @Column({ type: 'time' })
  closesLocal: string;

  @ApiProperty({ example: 0 })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
