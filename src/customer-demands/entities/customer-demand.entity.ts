import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Content } from '../../content/entities/content.entity';
import { User } from '../../users/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { CustomerDemandStatus } from '../enums/customer-demand-status.enum';
import { CustomerDemandAudit } from './customer-demand-audit.entity';
import { DemandShopInvitation } from './demand-shop-invitation.entity';

@Entity('customer_demands')
@Index(['userId'])
@Index(['status'])
@Index(['userId', 'status'])
export class CustomerDemand extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ example: 'Repeat last week’s staples' })
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @ApiProperty({ description: 'Full description for sellers' })
  @Column({ type: 'text' })
  details: string;

  @ApiPropertyOptional({ example: 'Around ₹2,500' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  budgetHint: string | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Registered content row (kind IMAGE) for receipt photo',
  })
  @Column({ type: 'uuid', nullable: true })
  receiptContentId: string | null;

  @ManyToOne(() => Content, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'receiptContentId' })
  receiptContent: Content | null;

  @ApiPropertyOptional({
    description: 'Order total from receipt in minor units (paise)',
    example: 250000,
  })
  @Column({ type: 'int', nullable: true })
  receiptOrderTotalMinor: number | null;

  @ApiProperty({ enum: CustomerDemandStatus })
  @Column({
    type: 'enum',
    enum: CustomerDemandStatus,
    default: CustomerDemandStatus.DRAFT,
  })
  status: CustomerDemandStatus;

  @ApiPropertyOptional({
    description: 'Set when status becomes LIVE',
  })
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Delivery point used to match shops (publish)',
  })
  @Column({ type: 'double precision', nullable: true })
  deliveryLatitude: number | null;

  @ApiPropertyOptional()
  @Column({ type: 'double precision', nullable: true })
  deliveryLongitude: number | null;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Invitation the customer accepted (demand status AWARDED)',
  })
  @Column({ type: 'uuid', nullable: true })
  awardedInvitationId: string | null;

  @OneToMany(() => CustomerDemandAudit, (a) => a.demand)
  audits: CustomerDemandAudit[];

  @OneToMany(() => DemandShopInvitation, (i) => i.demand)
  shopInvitations: DemandShopInvitation[];
}
