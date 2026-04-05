import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopSubscriptionStatus } from '../enums/shop-subscription-status.enum';

export type ShopSubscriptionAccessPhase =
  | 'need_trial'
  | 'trial_active'
  | 'trial_expired'
  | 'subscribed';

export class ShopSubscriptionAccessDto {
  @ApiProperty({ format: 'uuid' })
  shopId: string;

  @ApiPropertyOptional({ enum: ShopSubscriptionStatus })
  status: ShopSubscriptionStatus | null;

  @ApiProperty({
    enum: ['need_trial', 'trial_active', 'trial_expired', 'subscribed'],
  })
  phase: ShopSubscriptionAccessPhase;

  @ApiProperty({
    description:
      'Whether seller app features should be enabled (trial active or paid subscription).',
  })
  hasFeatureAccess: boolean;

  @ApiPropertyOptional({ format: 'date-time' })
  trialStartedAt: Date | null;

  @ApiPropertyOptional({ format: 'date-time' })
  trialEndsAt: Date | null;

  @ApiProperty({
    description: 'Whole days left in trial; 0 when not in an active trial.',
    example: 12,
  })
  trialDaysRemaining: number;

  @ApiPropertyOptional({ example: 'FREE' })
  subscriptionPlanCode: string | null;
}
