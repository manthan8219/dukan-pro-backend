import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { ShopsService } from '../shops/shops.service';
import { ShopSubscription } from '../subscriptions/entities/shop-subscription.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { ShopSubscriptionStatus } from '../subscriptions/enums/shop-subscription-status.enum';
import { SubscriptionBillingPeriod } from '../subscriptions/enums/subscription-billing-period.enum';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';
import { RazorpayCheckoutOrder } from './entities/razorpay-checkout-order.entity';
import { RazorpayClientService } from './razorpay-client.service';
import { SELLER_PLAN_CHECKOUT } from './seller-paid-plan.constants';

function addMonthsUtc(d: Date, months: number): Date {
  const x = new Date(d.getTime());
  x.setUTCMonth(x.getUTCMonth() + months);
  return x;
}

function addYearsUtc(d: Date, years: number): Date {
  const x = new Date(d.getTime());
  x.setUTCFullYear(x.getUTCFullYear() + years);
  return x;
}

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

@Injectable()
export class RazorpayCheckoutService {
  private readonly logger = new Logger(RazorpayCheckoutService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly shopsService: ShopsService,
    private readonly razorpayClient: RazorpayClientService,
    private readonly dataSource: DataSource,
    @InjectRepository(RazorpayCheckoutOrder)
    private readonly checkoutRepo: Repository<RazorpayCheckoutOrder>,
  ) {}

  async createOrder(
    ownerUserId: string,
    dto: CreateRazorpayOrderDto,
  ): Promise<{ id: string; amount: number; currency: string }> {
    await this.shopsService.findOneOwnedByUser(dto.shopId, ownerUserId);

    const spec = SELLER_PLAN_CHECKOUT[dto.planId];
    const plan = await this.dataSource.getRepository(SubscriptionPlan).findOne({
      where: { id: spec.subscriptionPlanId, isDeleted: false, isActive: true },
    });
    if (!plan) {
      throw new BadRequestException('Subscription plan is not available.');
    }
    if (plan.priceAmountMinor !== spec.amountMinor) {
      this.logger.error(
        `Plan ${plan.id} price mismatch: DB=${plan.priceAmountMinor} spec=${spec.amountMinor}`,
      );
      throw new BadRequestException('Plan pricing is misconfigured. Contact support.');
    }

    const receipt = `s${dto.shopId.replace(/-/g, '').slice(0, 10)}_${dto.planId}_${Date.now().toString(36)}`.slice(
      0,
      40,
    );

    const { id: razorpayOrderId } = await this.razorpayClient.createOrder(
      spec.amountMinor,
      receipt,
    );

    const row = this.checkoutRepo.create({
      shopId: dto.shopId,
      ownerUserId,
      planKey: dto.planId,
      subscriptionPlanId: spec.subscriptionPlanId,
      amountMinor: spec.amountMinor,
      currency: 'INR',
      razorpayOrderId,
      status: 'PENDING',
    });
    await this.checkoutRepo.save(row);

    return {
      id: razorpayOrderId,
      amount: spec.amountMinor,
      currency: 'INR',
    };
  }

  async verifyPayment(
    ownerUserId: string,
    dto: VerifyRazorpayPaymentDto,
  ): Promise<{ success: boolean; alreadyProcessed: boolean }> {
    const secret = this.config.get<string>('RAZORPAY_KEY_SECRET')?.trim();
    if (!secret) {
      throw new BadRequestException('Razorpay is not configured on the server.');
    }

    if (
      !verifyRazorpaySignature(
        dto.razorpay_order_id,
        dto.razorpay_payment_id,
        dto.razorpay_signature,
        secret,
      )
    ) {
      throw new BadRequestException('Invalid payment signature.');
    }

    await this.shopsService.findOneOwnedByUser(dto.shopId, ownerUserId);

    const checkout = await this.checkoutRepo.findOne({
      where: {
        razorpayOrderId: dto.razorpay_order_id,
        shopId: dto.shopId,
        ownerUserId,
        isDeleted: false,
      },
    });
    if (!checkout) {
      throw new NotFoundException('No checkout session found for this order.');
    }

    if (checkout.status === 'COMPLETED') {
      if (checkout.razorpayPaymentId === dto.razorpay_payment_id) {
        return { success: true, alreadyProcessed: true };
      }
      throw new ConflictException('This order was already paid with a different payment.');
    }

    let payment: Awaited<ReturnType<RazorpayClientService['fetchPayment']>>;
    try {
      payment = await this.razorpayClient.fetchPayment(dto.razorpay_payment_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Razorpay fetchPayment failed: ${msg}`);
      throw new BadRequestException('Could not confirm payment with Razorpay.');
    }

    if ((payment.order_id ?? '') !== dto.razorpay_order_id) {
      throw new BadRequestException('Payment does not belong to this order.');
    }
    if (payment.currency !== 'INR') {
      throw new BadRequestException('Unexpected payment currency.');
    }
    if (payment.amount !== checkout.amountMinor) {
      this.logger.warn(
        `Amount mismatch order=${checkout.id} expected=${checkout.amountMinor} got=${payment.amount}`,
      );
      throw new BadRequestException('Payment amount does not match order.');
    }
    if (payment.status !== 'captured') {
      throw new BadRequestException(
        `Payment is not captured yet (status: ${payment.status}).`,
      );
    }

    const now = new Date();
    const plan = await this.dataSource.getRepository(SubscriptionPlan).findOne({
      where: { id: checkout.subscriptionPlanId, isDeleted: false },
    });
    if (!plan) {
      throw new BadRequestException('Subscription plan missing.');
    }

    const periodEnd =
      plan.billingPeriod === SubscriptionBillingPeriod.MONTHLY
        ? addMonthsUtc(now, 1)
        : plan.billingPeriod === SubscriptionBillingPeriod.YEARLY
          ? addYearsUtc(now, 1)
          : addYearsUtc(now, 1);

    let appliedSubscription = false;
    await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .createQueryBuilder(RazorpayCheckoutOrder, 'o')
        .setLock('pessimistic_write')
        .where('o.id = :id', { id: checkout.id })
        .getOne();
      if (!locked) {
        throw new NotFoundException('Checkout session disappeared.');
      }
      if (locked.status === 'COMPLETED') {
        if (locked.razorpayPaymentId !== dto.razorpay_payment_id) {
          throw new ConflictException(
            'This order was already completed with a different payment.',
          );
        }
        return;
      }

      const subRepo = manager.getRepository(ShopSubscription);
      let sub = await subRepo.findOne({
        where: { shopId: dto.shopId, isDeleted: false },
      });
      if (!sub) {
        sub = subRepo.create({ shopId: dto.shopId });
      }
      sub.subscriptionPlanId = checkout.subscriptionPlanId;
      sub.status = ShopSubscriptionStatus.ACTIVE;
      sub.externalBillingSubscriptionId = dto.razorpay_payment_id;
      sub.trialStartedAt = null;
      sub.trialEndsAt = null;
      sub.currentPeriodStart = now;
      sub.currentPeriodEnd = periodEnd;
      sub.canceledAt = null;
      await subRepo.save(sub);

      locked.status = 'COMPLETED';
      locked.razorpayPaymentId = dto.razorpay_payment_id;
      await manager.save(RazorpayCheckoutOrder, locked);
      appliedSubscription = true;
    });

    return {
      success: true,
      alreadyProcessed: !appliedSubscription,
    };
  }
}
