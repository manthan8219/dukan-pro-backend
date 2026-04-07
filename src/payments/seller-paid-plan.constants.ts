import { SubscriptionBillingPeriod } from '../subscriptions/enums/subscription-billing-period.enum';

/** Seeded in migration `1775471000000-SellerPaidPlansAndRazorpayCheckoutOrders`. */
export const SELLER_PRO_MONTHLY_PLAN_ID =
  '10000000-0000-4000-8000-000000000002';

/** Seeded in migration `1775471000000-SellerPaidPlansAndRazorpayCheckoutOrders`. */
export const SELLER_PRO_YEARLY_PLAN_ID =
  '10000000-0000-4000-8000-000000000003';

/** GST-inclusive totals in paise — must match `PLAN_CONFIG` in the seller app. */
export const SELLER_PLAN_CHECKOUT: Record<
  'monthly' | 'yearly',
  { subscriptionPlanId: string; amountMinor: number; billingPeriod: SubscriptionBillingPeriod }
> = {
  monthly: {
    subscriptionPlanId: SELLER_PRO_MONTHLY_PLAN_ID,
    amountMinor: 58_800,
    billingPeriod: SubscriptionBillingPeriod.MONTHLY,
  },
  yearly: {
    subscriptionPlanId: SELLER_PRO_YEARLY_PLAN_ID,
    amountMinor: 589_900,
    billingPeriod: SubscriptionBillingPeriod.YEARLY,
  },
};
