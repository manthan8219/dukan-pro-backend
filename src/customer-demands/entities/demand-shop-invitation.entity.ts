import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Content } from '../../content/entities/content.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { DemandShopInvitationResponse } from '../enums/demand-shop-invitation-response.enum';
import { CustomerDemand } from './customer-demand.entity';

@Entity('demand_shop_invitations')
@Unique(['demandId', 'shopId'])
@Index(['shopId', 'responseKind'])
@Index(['demandId'])
export class DemandShopInvitation extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  demandId: string;

  @ManyToOne(() => CustomerDemand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'demandId' })
  demand: CustomerDemand;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({ enum: DemandShopInvitationResponse })
  @Column({
    type: 'enum',
    enum: DemandShopInvitationResponse,
    default: DemandShopInvitationResponse.PENDING,
  })
  responseKind: DemandShopInvitationResponse;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  rejectReason: string | null;

  @ApiPropertyOptional({ description: 'Seller quotation / explanation' })
  @Column({ type: 'text', nullable: true })
  quotationText: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Bill PDF or extra image (content kind DOCUMENT or IMAGE)',
  })
  @Column({ type: 'uuid', nullable: true })
  quotationDocumentContentId: string | null;

  @ManyToOne(() => Content, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'quotationDocumentContentId' })
  quotationDocument: Content | null;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Typically the shop owner user id',
  })
  @Column({ type: 'uuid', nullable: true })
  respondedByUserId: string | null;
}
