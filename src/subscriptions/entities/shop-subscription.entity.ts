import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { ShopSubscriptionStatus } from '../enums/shop-subscription-status.enum';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { SubscriptionPlan } from './subscription-plan.entity';

@Entity('shop_subscriptions')
@Index(['shopId'], { unique: true })
export class ShopSubscription extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  subscriptionPlanId: string;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subscriptionPlanId' })
  subscriptionPlan: SubscriptionPlan;

  @ApiProperty({ enum: ShopSubscriptionStatus })
  @Column({
    type: 'enum',
    enum: ShopSubscriptionStatus,
    enumName: 'shop_subscriptions_status_enum',
  })
  status: ShopSubscriptionStatus;

  @ApiPropertyOptional({
    description: 'When the current trial started (if applicable)',
  })
  @Column({ type: 'timestamptz', nullable: true })
  trialStartedAt: Date | null;

  @ApiPropertyOptional({
    description: 'When the trial ends; null if not trialing',
  })
  @Column({ type: 'timestamptz', nullable: true })
  trialEndsAt: Date | null;

  @ApiPropertyOptional({
    description: 'Start of the current paid billing period',
  })
  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodStart: Date | null;

  @ApiPropertyOptional({
    description: 'End of the current paid billing period',
  })
  @Column({ type: 'timestamptz', nullable: true })
  currentPeriodEnd: Date | null;

  @ApiPropertyOptional({ example: 'LAUNCH50' })
  @Column({ type: 'varchar', length: 64, nullable: true })
  promotionalCouponCode: string | null;

  @ApiPropertyOptional({
    description: 'When the promotion was applied',
  })
  @Column({ type: 'timestamptz', nullable: true })
  promotionAppliedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Percent discount from the coupon (0–100), if applicable',
    example: 25.5,
  })
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  promotionalDiscountPercent: string | null;

  @ApiPropertyOptional({
    description:
      'Extra promotion payload (fixed amount off, duration, provider ids, …)',
  })
  @Column({ type: 'jsonb', nullable: true })
  promotionMetadata: Record<string, unknown> | null;

  @ApiPropertyOptional({
    description:
      'Payment provider subscription id (e.g. Stripe) when integrated',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalBillingSubscriptionId: string | null;

  @ApiPropertyOptional()
  @Column({ type: 'timestamptz', nullable: true })
  canceledAt: Date | null;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
