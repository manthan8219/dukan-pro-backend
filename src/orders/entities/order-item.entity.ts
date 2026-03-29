import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { ShopProduct } from '../../shop-products/entities/shop-product.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
@Index(['orderId'])
@Index(['shopProductId'])
export class OrderItem extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopProductId: string;

  @ManyToOne(() => ShopProduct, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shopProductId' })
  shopProduct: ShopProduct;

  @ApiProperty({ description: 'Unit price at checkout (minor units).' })
  @Column({ type: 'int' })
  unitPriceMinor: number;

  @ApiProperty()
  @Column({ type: 'int' })
  quantity: number;

  @ApiProperty({ description: 'unitPriceMinor * quantity' })
  @Column({ type: 'int' })
  lineTotalMinor: number;

  @ApiProperty({ description: 'Product display name at checkout (snapshot).' })
  @Column({ type: 'varchar', length: 300 })
  productNameSnapshot: string;
}
