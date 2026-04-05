import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ShopsService } from '../shops/shops.service';
import { ApplyShopPromotionDto } from './dto/apply-shop-promotion.dto';
import { StartShopTrialDto } from './dto/start-shop-trial.dto';
import { UpsertShopSubscriptionDto } from './dto/upsert-shop-subscription.dto';
import { ShopSubscription } from './entities/shop-subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { ShopSubscriptionStatus } from './enums/shop-subscription-status.enum';
import { ShopSubscriptionAccessDto } from './dto/shop-subscription-access.dto';
import {
  DEFAULT_FREE_SUBSCRIPTION_PLAN_ID,
  SELLER_APP_FREE_TRIAL_DAYS,
} from './subscription-plan.constants';
import { SubscriptionPlansService } from './subscription-plans.service';

function addDaysUtc(d: Date, days: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + days);
  return out;
}

function percentToNumericString(value: number): string {
  return value.toFixed(2);
}

function computeTrialDaysRemaining(trialEndsAt: Date): number {
  const ms = trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

/**
 * When `trialEndsAt` is missing (e.g. manual SQL) but `trialStartedAt` is set, infer the window so
 * access checks match reality for TRIALING or ACTIVE rows.
 */
function inferTrialEndIfMissing(sub: ShopSubscription): Date | null {
  if (sub.trialEndsAt || !sub.trialStartedAt) return null;
  if (
    sub.status !== ShopSubscriptionStatus.TRIALING &&
    sub.status !== ShopSubscriptionStatus.ACTIVE
  ) {
    return null;
  }
  const planDays = sub.subscriptionPlan?.trialDays ?? 0;
  const days = planDays > 0 ? planDays : SELLER_APP_FREE_TRIAL_DAYS;
  return addDaysUtc(new Date(sub.trialStartedAt), days);
}

@Injectable()
export class ShopSubscriptionsService {
  constructor(
    @InjectRepository(ShopSubscription)
    private readonly shopSubscriptionsRepository: Repository<ShopSubscription>,
    private readonly subscriptionPlansService: SubscriptionPlansService,
    private readonly shopsService: ShopsService,
  ) {}

  async findByShopId(shopId: string): Promise<ShopSubscription | null> {
    await this.shopsService.findOne(shopId);
    return this.shopSubscriptionsRepository.findOne({
      where: { shopId, isDeleted: false },
      relations: { subscriptionPlan: true },
    });
  }

  async getForShopOrThrow(shopId: string): Promise<ShopSubscription> {
    const sub = await this.findByShopId(shopId);
    if (!sub) {
      throw new NotFoundException(`No subscription for shop ${shopId}`);
    }
    return sub;
  }

  /**
   * Create or replace the single subscription row for a shop (by unique shopId).
   */
  async upsertForShop(
    shopId: string,
    dto: UpsertShopSubscriptionDto,
  ): Promise<ShopSubscription> {
    await this.shopsService.findOne(shopId);
    const plan = await this.subscriptionPlansService.assertActivePlan(
      dto.subscriptionPlanId,
    );

    let row = await this.shopSubscriptionsRepository.findOne({
      where: { shopId, isDeleted: false },
    });

    if (!row) {
      row = this.shopSubscriptionsRepository.create({ shopId });
    }

    row.subscriptionPlanId = plan.id;
    row.status = dto.status ?? row.status ?? ShopSubscriptionStatus.ACTIVE;
    row.trialStartedAt =
      dto.trialStartedAt !== undefined
        ? dto.trialStartedAt
        : row.trialStartedAt;
    row.trialEndsAt =
      dto.trialEndsAt !== undefined ? dto.trialEndsAt : row.trialEndsAt;
    row.currentPeriodStart =
      dto.currentPeriodStart !== undefined
        ? dto.currentPeriodStart
        : row.currentPeriodStart;
    row.currentPeriodEnd =
      dto.currentPeriodEnd !== undefined
        ? dto.currentPeriodEnd
        : row.currentPeriodEnd;
    row.promotionalCouponCode =
      dto.promotionalCouponCode !== undefined
        ? dto.promotionalCouponCode
        : row.promotionalCouponCode;
    row.promotionAppliedAt =
      dto.promotionAppliedAt !== undefined
        ? dto.promotionAppliedAt
        : row.promotionAppliedAt;
    if (dto.promotionalDiscountPercent !== undefined) {
      row.promotionalDiscountPercent = percentToNumericString(
        dto.promotionalDiscountPercent,
      );
    }
    row.promotionMetadata =
      dto.promotionMetadata !== undefined
        ? dto.promotionMetadata
        : row.promotionMetadata;
    row.externalBillingSubscriptionId =
      dto.externalBillingSubscriptionId !== undefined
        ? dto.externalBillingSubscriptionId
        : row.externalBillingSubscriptionId;
    row.canceledAt =
      dto.canceledAt !== undefined ? dto.canceledAt : row.canceledAt;
    row.notes = dto.notes !== undefined ? dto.notes : row.notes;

    const saved = await this.shopSubscriptionsRepository.save(row);
    return this.shopSubscriptionsRepository.findOneOrFail({
      where: { id: saved.id },
      relations: { subscriptionPlan: true },
    });
  }

  async startTrial(
    shopId: string,
    dto: StartShopTrialDto,
  ): Promise<ShopSubscription> {
    const plan = await this.subscriptionPlansService.assertActivePlan(
      dto.subscriptionPlanId,
    );
    const trialDays = dto.trialDaysOverride ?? plan.trialDays;
    if (trialDays <= 0) {
      throw new BadRequestException(
        'Trial length must be positive (set plan trialDays or pass trialDaysOverride)',
      );
    }
    const started = dto.trialStartedAt ?? new Date();
    const ends = addDaysUtc(started, trialDays);

    return this.upsertForShop(shopId, {
      subscriptionPlanId: plan.id,
      status: ShopSubscriptionStatus.TRIALING,
      trialStartedAt: started,
      trialEndsAt: ends,
      promotionalCouponCode: dto.promotionalCouponCode,
      promotionAppliedAt: dto.promotionalCouponCode ? new Date() : undefined,
    });
  }

  async applyPromotion(
    shopId: string,
    dto: ApplyShopPromotionDto,
  ): Promise<ShopSubscription> {
    const existing = await this.getForShopOrThrow(shopId);
    existing.promotionalCouponCode = dto.promotionalCouponCode;
    existing.promotionAppliedAt = new Date();
    if (dto.promotionalDiscountPercent !== undefined) {
      existing.promotionalDiscountPercent = percentToNumericString(
        dto.promotionalDiscountPercent,
      );
    }
    if (dto.promotionMetadata !== undefined) {
      existing.promotionMetadata = dto.promotionMetadata;
    }
    await this.shopSubscriptionsRepository.save(existing);
    return this.shopSubscriptionsRepository.findOneOrFail({
      where: { id: existing.id },
      relations: { subscriptionPlan: true },
    });
  }

  async updateStatus(
    shopId: string,
    status: ShopSubscriptionStatus,
  ): Promise<ShopSubscription> {
    const existing = await this.getForShopOrThrow(shopId);
    existing.status = status;
    if (status === ShopSubscriptionStatus.CANCELED) {
      existing.canceledAt = existing.canceledAt ?? new Date();
    }
    await this.shopSubscriptionsRepository.save(existing);
    return this.shopSubscriptionsRepository.findOneOrFail({
      where: { id: existing.id },
      relations: { subscriptionPlan: true },
    });
  }

  /**
   * Attach the default free plan to a new shop (call after shop row exists).
   */
  async attachDefaultFreePlan(
    shopId: string,
    freePlanId: string,
  ): Promise<ShopSubscription> {
    return this.upsertForShop(shopId, {
      subscriptionPlanId: freePlanId,
      status: ShopSubscriptionStatus.ACTIVE,
    });
  }

  async attachSeededFreePlan(shopId: string): Promise<ShopSubscription> {
    return this.attachDefaultFreePlan(
      shopId,
      DEFAULT_FREE_SUBSCRIPTION_PLAN_ID,
    );
  }

  private async expireTrialIfPast(
    sub: ShopSubscription,
  ): Promise<ShopSubscription> {
    if (sub.status !== ShopSubscriptionStatus.TRIALING || !sub.trialEndsAt) {
      return sub;
    }
    if (new Date() < sub.trialEndsAt) {
      return sub;
    }
    sub.status = ShopSubscriptionStatus.EXPIRED;
    await this.shopSubscriptionsRepository.save(sub);
    return sub;
  }

  private async loadSubscriptionWithPlan(
    id: string,
  ): Promise<ShopSubscription> {
    return this.shopSubscriptionsRepository.findOneOrFail({
      where: { id },
      relations: { subscriptionPlan: true },
    });
  }

  /**
   * Public summary for the seller app (paywall, feature gating).
   */
  async getAccessSummary(shopId: string): Promise<ShopSubscriptionAccessDto> {
    let sub = await this.shopSubscriptionsRepository.findOne({
      where: { shopId, isDeleted: false },
      relations: { subscriptionPlan: true },
    });

    if (!sub) {
      return {
        shopId,
        status: null,
        phase: 'need_trial',
        hasFeatureAccess: false,
        trialStartedAt: null,
        trialEndsAt: null,
        trialDaysRemaining: 0,
        subscriptionPlanCode: null,
      };
    }

    sub = await this.expireTrialIfPast(sub);
    const planCode = sub.subscriptionPlan?.code ?? null;
    const now = new Date();

    const inferredTrialEnd = inferTrialEndIfMissing(sub);
    const effectiveTrialEnd = sub.trialEndsAt ?? inferredTrialEnd ?? null;

    if (sub.externalBillingSubscriptionId) {
      return {
        shopId,
        status: sub.status,
        phase: 'subscribed',
        hasFeatureAccess: true,
        trialStartedAt: sub.trialStartedAt,
        trialEndsAt: sub.trialEndsAt,
        trialDaysRemaining: 0,
        subscriptionPlanCode: planCode,
      };
    }

    if (sub.status === ShopSubscriptionStatus.EXPIRED) {
      return {
        shopId,
        status: sub.status,
        phase: 'trial_expired',
        hasFeatureAccess: false,
        trialStartedAt: sub.trialStartedAt,
        trialEndsAt: sub.trialEndsAt,
        trialDaysRemaining: 0,
        subscriptionPlanCode: planCode,
      };
    }

    // Future trial window (stored `trialEndsAt` and/or inferred from `trialStartedAt`).
    // Must run before the "need_trial" branch: rows with `trial_ends_at` set but
    // `trial_started_at` null previously hit ACTIVE && !trialStartedAt and wrongly got need_trial.
    if (effectiveTrialEnd && now < effectiveTrialEnd) {
      return {
        shopId,
        status: sub.status,
        phase: 'trial_active',
        hasFeatureAccess: true,
        trialStartedAt: sub.trialStartedAt,
        trialEndsAt: effectiveTrialEnd,
        trialDaysRemaining: computeTrialDaysRemaining(effectiveTrialEnd),
        subscriptionPlanCode: planCode,
      };
    }

    // Seeded FREE plan row: no trial window on record yet — seller must start trial in the app.
    if (
      sub.status === ShopSubscriptionStatus.ACTIVE &&
      !sub.trialStartedAt &&
      !sub.trialEndsAt
    ) {
      return {
        shopId,
        status: sub.status,
        phase: 'need_trial',
        hasFeatureAccess: false,
        trialStartedAt: null,
        trialEndsAt: null,
        trialDaysRemaining: 0,
        subscriptionPlanCode: planCode,
      };
    }

    if (effectiveTrialEnd && now >= effectiveTrialEnd) {
      sub.status = ShopSubscriptionStatus.EXPIRED;
      await this.shopSubscriptionsRepository.save(sub);
      return {
        shopId,
        status: ShopSubscriptionStatus.EXPIRED,
        phase: 'trial_expired',
        hasFeatureAccess: false,
        trialStartedAt: sub.trialStartedAt,
        trialEndsAt: effectiveTrialEnd,
        trialDaysRemaining: 0,
        subscriptionPlanCode: planCode,
      };
    }

    return {
      shopId,
      status: sub.status,
      phase: 'need_trial',
      hasFeatureAccess: false,
      trialStartedAt: sub.trialStartedAt,
      trialEndsAt: sub.trialEndsAt,
      trialDaysRemaining: 0,
      subscriptionPlanCode: planCode,
    };
  }

  /**
   * Seller taps “Start free trial”: fixed {@link SELLER_APP_FREE_TRIAL_DAYS}-day trial.
   * Idempotent while trial is still running. Rejects if trial already ended.
   */
  async startSellerAppFreeTrial(
    shopId: string,
    userId: string,
  ): Promise<ShopSubscription> {
    await this.shopsService.findOneOwnedByUser(shopId, userId);

    let sub = await this.shopSubscriptionsRepository.findOne({
      where: { shopId, isDeleted: false },
    });
    if (!sub) {
      sub = await this.attachSeededFreePlan(shopId);
    }

    sub = await this.expireTrialIfPast(sub);
    const now = new Date();

    if (sub.externalBillingSubscriptionId) {
      return this.loadSubscriptionWithPlan(sub.id);
    }

    if (
      sub.status === ShopSubscriptionStatus.TRIALING &&
      sub.trialEndsAt &&
      now < sub.trialEndsAt
    ) {
      return this.loadSubscriptionWithPlan(sub.id);
    }

    if (sub.status === ShopSubscriptionStatus.EXPIRED) {
      throw new BadRequestException(
        'Your free trial has ended. Subscribe to continue.',
      );
    }

    if (sub.trialStartedAt && sub.trialEndsAt && now >= sub.trialEndsAt) {
      throw new BadRequestException(
        'Your free trial has ended. Subscribe to continue.',
      );
    }

    const started = new Date();
    const ends = addDaysUtc(started, SELLER_APP_FREE_TRIAL_DAYS);
    sub.subscriptionPlanId = DEFAULT_FREE_SUBSCRIPTION_PLAN_ID;
    sub.status = ShopSubscriptionStatus.TRIALING;
    sub.trialStartedAt = started;
    sub.trialEndsAt = ends;
    sub.canceledAt = null;
    await this.shopSubscriptionsRepository.save(sub);
    return this.loadSubscriptionWithPlan(sub.id);
  }

  /**
   * Create the initial shop_subscriptions row inside an existing transaction (e.g. onboarding).
   */
  async attachSeededFreePlanWithManager(
    manager: EntityManager,
    shopId: string,
  ): Promise<void> {
    const planRepo = manager.getRepository(SubscriptionPlan);
    const plan = await planRepo.findOne({
      where: {
        id: DEFAULT_FREE_SUBSCRIPTION_PLAN_ID,
        isDeleted: false,
        isActive: true,
      },
    });
    if (!plan) {
      throw new BadRequestException(
        'Default subscription plan is missing; run database migrations',
      );
    }
    const subRepo = manager.getRepository(ShopSubscription);
    const row = subRepo.create({
      shopId,
      subscriptionPlanId: DEFAULT_FREE_SUBSCRIPTION_PLAN_ID,
      status: ShopSubscriptionStatus.ACTIVE,
    });
    await subRepo.save(row);
  }
}
