import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { User } from '../../users/entities/user.entity';
import { UserDeliveryAddress } from '../../user-delivery-addresses/entities/user-delivery-address.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderPaymentMethod } from '../enums/order-payment-method.enum';
import { OrderItem } from './order-item.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('orders')
@Index(['userId'])
@Index(['shopId'])
@Index(['deliveryAddressId'])
export class Order extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  deliveryAddressId: string;

  @ManyToOne(() => UserDeliveryAddress, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'deliveryAddressId' })
  deliveryAddress: UserDeliveryAddress;

  @ApiProperty({ enum: OrderStatus })
  @Column({ type: 'enum', enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({
    description: 'Sum of line totals for this shop (minor units, e.g. paise).',
  })
  @Column({ type: 'int' })
  itemsSubtotalMinor: number;

  @ApiProperty({
    description:
      'Delivery fee share for this order (minor units). Split from a single checkout when the cart spans multiple shops.',
  })
  @Column({ type: 'int' })
  deliveryFeeMinor: number;

  @ApiProperty({ description: 'itemsSubtotalMinor + deliveryFeeMinor' })
  @Column({ type: 'int' })
  totalMinor: number;

  @ApiPropertyOptional({ enum: OrderPaymentMethod })
  @Column({
    type: 'enum',
    enum: OrderPaymentMethod,
    nullable: true,
  })
  paymentMethod: OrderPaymentMethod | null;

  @ApiPropertyOptional({
    description: 'When the order was marked delivered.',
  })
  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @OneToMany(() => OrderItem, (i) => i.order, { cascade: true })
  items: OrderItem[];
}
