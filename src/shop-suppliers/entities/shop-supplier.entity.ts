import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('shop_suppliers')
@Index(['shopId', 'createdAt'])
@Index(['shopId', 'clientLocalId'], { unique: true })
export class ShopSupplier extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty()
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 64 })
  phone: string;

  @ApiPropertyOptional()
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  address: string | null;

  @ApiProperty({ type: [String] })
  @Column({ type: 'jsonb' })
  categories: string[];

  @ApiProperty({ description: 'Amount owed in minor units (e.g. paise)' })
  @Column({ type: 'int', default: 0 })
  amountOwedMinor: number;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  note: string | null;

  @ApiPropertyOptional({
    description:
      'Stable id from the seller app for idempotent creates (e.g. local UUID)',
  })
  @Column({ type: 'varchar', length: 128, nullable: true })
  clientLocalId: string | null;
}
