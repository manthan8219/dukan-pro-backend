import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { KhataEntryKind } from '../enums/khata-entry-kind.enum';
import { ShopCustomer } from './shop-customer.entity';

@Entity('khata_entries')
@Index(['shopCustomerId', 'createdAt'])
export class KhataEntry extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopCustomerId: string;

  @ManyToOne(() => ShopCustomer, (c) => c.khataEntries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopCustomerId' })
  shopCustomer: ShopCustomer;

  @ApiProperty({ enum: KhataEntryKind })
  @Column({
    type: 'enum',
    enum: KhataEntryKind,
    enumName: 'khata_entry_kind_enum',
  })
  kind: KhataEntryKind;

  @ApiProperty({
    description: 'Amount in minor units (e.g. paise); always positive; meaning depends on kind.',
    example: 15000,
  })
  @Column({ type: 'int' })
  amountMinor: number;

  @ApiPropertyOptional({ description: 'Optional line note (e.g. item description).' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiPropertyOptional({
    description: 'Extensible link type, e.g. order, invoice.',
    example: 'order',
  })
  @Column({ type: 'varchar', length: 64, nullable: true })
  referenceType: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  referenceId: string | null;

  @ApiPropertyOptional({
    description: 'Arbitrary structured data for future features (receipt id, payment mode, …).',
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
