import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { KhataEntry } from './khata-entry.entity';

@Entity('shop_customers')
@Index(['shopId'])
export class ShopCustomer extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Linked platform user when this khata party is a registered customer; null for walk-in-only records.',
  })
  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @ApiProperty({ example: 'Ramesh Kumar' })
  @Column({ type: 'varchar', length: 200 })
  displayName: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @Column({ type: 'varchar', length: 32, nullable: true })
  phone: string | null;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => KhataEntry, (e) => e.shopCustomer)
  khataEntries: KhataEntry[];
}
