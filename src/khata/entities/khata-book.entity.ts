import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from '../../shops/entities/shop.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { KhataEntry } from './khata-entry.entity';
import { ShopCustomer } from './shop-customer.entity';

/**
 * One ledger ("khata book") per shop customer party.
 * {@link balanceMinor} is updated on every credit/debit entry (denormalized for fast reads).
 *
 * Note: Do not add a separate @Column for shopCustomerId — it is owned by the
 * {@link shopCustomer} JoinColumn only (duplicate mapping breaks TypeORM queries).
 */
/** Unique on shopCustomerId is enforced in DB via migration — not @Index here (no shopCustomerId property). */
@Entity('khata_books')
@Index(['shopId'])
export class KhataBook extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @OneToOne(() => ShopCustomer, (c) => c.khataBook, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopCustomerId' })
  shopCustomer: ShopCustomer;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Mirrors shop_customers.userId when linked to a platform user.',
  })
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ApiProperty({
    description:
      'Outstanding balance in minor units (paise). CREDIT increases, DEBIT decreases.',
    example: 15000,
  })
  @Column({ type: 'int', default: 0 })
  balanceMinor: number;

  @OneToMany(() => KhataEntry, (e) => e.khataBook)
  khataEntries: KhataEntry[];
}
