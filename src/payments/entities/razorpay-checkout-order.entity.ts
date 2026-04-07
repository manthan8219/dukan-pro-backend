import { BaseEntity } from '../../commons/entities/base.entity';
import { Shop } from '../../shops/entities/shop.entity';
import { SubscriptionPlan } from '../../subscriptions/entities/subscription-plan.entity';
import { User } from '../../users/entities/user.entity';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

export type RazorpayCheckoutPlanKey = 'monthly' | 'yearly';

export type RazorpayCheckoutOrderStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';

@Entity('razorpay_checkout_orders')
@Index(['shopId', 'createdAt'])
export class RazorpayCheckoutOrder extends BaseEntity {
  @Column({ type: 'uuid' })
  shopId: string;

  @ManyToOne(() => Shop, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shopId' })
  shop: Shop;

  @Column({ type: 'uuid' })
  ownerUserId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerUserId' })
  ownerUser: User;

  @Column({ type: 'varchar', length: 16 })
  planKey: RazorpayCheckoutPlanKey;

  @Column({ type: 'uuid' })
  subscriptionPlanId: string;

  @ManyToOne(() => SubscriptionPlan, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subscriptionPlanId' })
  subscriptionPlan: SubscriptionPlan;

  @Column({ type: 'int' })
  amountMinor: number;

  @Column({ type: 'varchar', length: 8, default: 'INR' })
  currency: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  razorpayOrderId: string;

  @Column({ type: 'varchar', length: 24, default: 'PENDING' })
  status: RazorpayCheckoutOrderStatus;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  razorpayPaymentId: string | null;
}
