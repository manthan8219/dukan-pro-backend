import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../commons/entities/base.entity';
import { Column, Entity, Index } from 'typeorm';
import { SubscriptionBillingPeriod } from '../enums/subscription-billing-period.enum';

@Entity('subscription_plans')
@Index(['code'], { unique: true })
export class SubscriptionPlan extends BaseEntity {
  @ApiProperty({ example: 'pro_monthly' })
  @Column({ type: 'varchar', length: 64 })
  code: string;

  @ApiProperty({ example: 'Pro (monthly)' })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiPropertyOptional()
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    description: 'Default trial length in days when a shop starts on this plan',
    example: 14,
    default: 0,
  })
  @Column({ type: 'int', default: 0 })
  trialDays: number;

  @ApiProperty({ enum: SubscriptionBillingPeriod })
  @Column({
    type: 'enum',
    enum: SubscriptionBillingPeriod,
    enumName: 'subscription_plans_billing_period_enum',
  })
  billingPeriod: SubscriptionBillingPeriod;

  @ApiPropertyOptional({
    description:
      'Recurring price in minor units (e.g. paise); null for free / quote-only plans',
  })
  @Column({ type: 'int', nullable: true })
  priceAmountMinor: number | null;

  @ApiProperty({ example: 'INR', default: 'INR' })
  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency: string;

  @ApiPropertyOptional({
    description: 'Arbitrary feature flags or marketing copy for clients',
  })
  @Column({ type: 'jsonb', nullable: true })
  features: Record<string, unknown> | null;

  @ApiProperty({ default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ default: 0 })
  @Column({ type: 'int', default: 0 })
  sortOrder: number;
}
