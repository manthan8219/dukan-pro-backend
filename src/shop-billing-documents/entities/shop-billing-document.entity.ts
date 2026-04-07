import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Content } from '../../content/entities/content.entity';
import { Shop } from '../../shops/entities/shop.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { ShopBillingDocumentType } from '../enums/shop-billing-document-type.enum';
import { ShopBillingPaymentStatus } from '../enums/shop-billing-payment-status.enum';

@Entity('shop_billing_documents')
@Index(['shopId', 'issueDate'])
@Index(['shopId', 'documentType'])
@Index(['shopId', 'clientLocalId'], { unique: true })
export class ShopBillingDocument extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({ enum: ShopBillingDocumentType })
  @Column({ type: 'enum', enum: ShopBillingDocumentType })
  documentType: ShopBillingDocumentType;

  @ApiProperty({ example: 'INV-2024-001' })
  @Column({ type: 'varchar', length: 64 })
  documentNumber: string;

  @ApiPropertyOptional({
    description:
      'Stable id from the seller app (e.g. local UUID) for idempotent creates',
  })
  @Column({ type: 'varchar', length: 128, nullable: true })
  clientLocalId: string | null;

  @ApiProperty({ description: 'Total in minor units (e.g. paise)' })
  @Column({ type: 'int' })
  grandTotalMinor: number;

  @ApiProperty({ default: 'INR' })
  @Column({ type: 'varchar', length: 8, default: 'INR' })
  currency: string;

  @ApiProperty({ description: 'Document date (calendar day in shop timezone agnostic)' })
  @Column({ type: 'date' })
  issueDate: string;

  @ApiPropertyOptional()
  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @ApiPropertyOptional({ enum: ShopBillingPaymentStatus })
  @Column({
    type: 'enum',
    enum: ShopBillingPaymentStatus,
    nullable: true,
  })
  paymentStatus: ShopBillingPaymentStatus | null;

  @ApiProperty({ default: 0 })
  @Column({ type: 'int', default: 0 })
  paidAmountMinor: number;

  @ApiProperty({
    description: 'Full document payload as saved by the seller app (line items, customer, …)',
  })
  @Column({ type: 'jsonb' })
  snapshot: Record<string, unknown>;

  @ApiPropertyOptional({ format: 'uuid' })
  @Column({ type: 'uuid', nullable: true })
  pdfContentId: string | null;

  @ManyToOne(() => Content, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'pdfContentId' })
  pdfContent: Content | null;
}
