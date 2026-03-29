import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Content } from '../../content/entities/content.entity';
import { Product } from '../../products/entities/product.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('shop_products')
@Index(['shopId', 'productId'], { unique: true })
@Index(['shopId'])
@Index(['productId'])
export class ShopProduct extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @ApiProperty({ example: 24, description: 'Stock or on-hand quantity' })
  @Column({ type: 'int' })
  quantity: number;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Shop-specific product photo; uses product default if unset',
  })
  @Column({ type: 'uuid', nullable: true })
  imageContentId: string | null;

  @ManyToOne(() => Content, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'imageContentId' })
  imageContent: Content | null;

  @ApiProperty({
    example: 'PIECE',
    description: 'Unit label for quantity (e.g. PIECE, KG, L)',
  })
  @Column({ type: 'varchar', length: 32, default: 'PIECE' })
  unit: string;

  @ApiProperty({
    description:
      'Shop’s selling price in minor units only (e.g. paise). No catalog-level default — each shop sets this.',
    example: 2500,
  })
  @Column({ type: 'int' })
  priceMinor: number;

  @ApiProperty({
    example: 1,
    description: 'Minimum order quantity for this listing',
  })
  @Column({ type: 'int', default: 1 })
  minOrderQuantity: number;

  @ApiProperty({
    default: true,
    description: 'When false, listing is hidden without deleting the row',
  })
  @Column({ type: 'boolean', default: true })
  isListed: boolean;

  @ApiPropertyOptional({
    description: 'Shop-specific note (e.g. brand, pack size)',
  })
  @Column({ type: 'text', nullable: true })
  listingNotes: string | null;
}
