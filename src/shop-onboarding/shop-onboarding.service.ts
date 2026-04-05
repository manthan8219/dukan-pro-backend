import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Content } from '../content/entities/content.entity';
import { SellerPlan } from '../seller-profile/enums/seller-plan.enum';
import { SellerProfile } from '../seller-profile/entities/seller-profile.entity';
import { ShopContentLink } from '../shop-content/entities/shop-content-link.entity';
import { ShopDeliveryRadiusRule } from '../shop-delivery-radius-rules/entities/shop-delivery-radius-rule.entity';
import { ShopDeliveryFeeRule } from '../shops/entities/shop-delivery-fee-rule.entity';
import { ShopDeliverySlot } from '../shops/entities/shop-delivery-slot.entity';
import { ShopOpeningHour } from '../shops/entities/shop-opening-hour.entity';
import { ShopsService } from '../shops/shops.service';
import { ShopSubscriptionsService } from '../subscriptions/shop-subscriptions.service';
import { UsersService } from '../users/users.service';
import type { OnboardShopDto } from './dto/onboard-shop.dto';
import type { ShopOnboardingResponseDto } from './dto/shop-onboarding-response.dto';

function hhMmToTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function localTimeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => Number(x));
  return h * 60 + m;
}

@Injectable()
export class ShopOnboardingService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly shopsService: ShopsService,
    private readonly shopSubscriptionsService: ShopSubscriptionsService,
    private readonly usersService: UsersService,
  ) {}

  async onboard(
    userId: string,
    dto: OnboardShopDto,
  ): Promise<ShopOnboardingResponseDto> {
    await this.usersService.findOne(userId);

    const rules = dto.deliveryRadiusRules ?? [];
    const minAmounts = rules.map((r) =>
      (Math.round(r.minOrderAmount * 100) / 100).toFixed(2),
    );
    if (minAmounts.length !== new Set(minAmounts).size) {
      throw new BadRequestException(
        'deliveryRadiusRules: duplicate minOrderAmount values',
      );
    }

    for (const s of dto.deliverySlots ?? []) {
      if (localTimeToMinutes(s.endLocal) <= localTimeToMinutes(s.startLocal)) {
        throw new BadRequestException(
          `deliverySlots: endLocal must be after startLocal (weekday ${s.weekday})`,
        );
      }
    }

    for (const s of dto.openingHours ?? []) {
      if (localTimeToMinutes(s.endLocal) <= localTimeToMinutes(s.startLocal)) {
        throw new BadRequestException(
          `openingHours: endLocal must be after startLocal (weekday ${s.weekday})`,
        );
      }
    }

    const feeMins = (dto.deliveryFeeRules ?? []).map(
      (r) => r.minOrderSubtotalMinor,
    );
    if (feeMins.length !== new Set(feeMins).size) {
      throw new BadRequestException(
        'deliveryFeeRules: duplicate minOrderSubtotalMinor values',
      );
    }

    const photoIds = dto.shopPhotos?.map((p) => p.contentId) ?? [];
    if (photoIds.length !== new Set(photoIds).size) {
      throw new BadRequestException('shopPhotos: duplicate contentId');
    }

    return this.dataSource.transaction(async (manager) => {
      const shop = await this.shopsService.createWithManager(
        manager,
        userId,
        dto,
      );
      const shopId = shop.id;

      await this.shopSubscriptionsService.attachSeededFreePlanWithManager(
        manager,
        shopId,
      );

      const deliveryRadiusRuleIds: string[] = [];
      if (rules.length > 0) {
        const ruleRepo = manager.getRepository(ShopDeliveryRadiusRule);
        for (const r of rules) {
          const minOrderAmount = (
            Math.round(r.minOrderAmount * 100) / 100
          ).toFixed(2);
          const row = ruleRepo.create({
            shopId,
            minOrderAmount,
            maxServiceRadiusKm: r.maxServiceRadiusKm,
          });
          const saved = await ruleRepo.save(row);
          deliveryRadiusRuleIds.push(saved.id);
        }
      }

      const openingHourIds: string[] = [];
      const openings = dto.openingHours ?? [];
      if (openings.length > 0) {
        const hourRepo = manager.getRepository(ShopOpeningHour);
        const indexed = openings.map((s, idx) => ({ s, idx }));
        indexed.sort((a, b) => {
          const ao = a.s.sortOrder ?? a.idx;
          const bo = b.s.sortOrder ?? b.idx;
          if (ao !== bo) {
            return ao - bo;
          }
          if (a.s.weekday !== b.s.weekday) {
            return a.s.weekday - b.s.weekday;
          }
          return a.idx - b.idx;
        });
        for (let i = 0; i < indexed.length; i++) {
          const { s } = indexed[i];
          const row = hourRepo.create({
            shopId,
            weekday: s.weekday,
            opensLocal: hhMmToTime(s.startLocal),
            closesLocal: hhMmToTime(s.endLocal),
            sortOrder: s.sortOrder ?? i,
          });
          const saved = await hourRepo.save(row);
          openingHourIds.push(saved.id);
        }
      }

      const deliverySlotIds: string[] = [];
      const slots = dto.deliverySlots ?? [];
      if (slots.length > 0) {
        const slotRepo = manager.getRepository(ShopDeliverySlot);
        const indexed = slots.map((s, idx) => ({ s, idx }));
        indexed.sort((a, b) => {
          const ao = a.s.sortOrder ?? a.idx;
          const bo = b.s.sortOrder ?? b.idx;
          if (ao !== bo) {
            return ao - bo;
          }
          if (a.s.weekday !== b.s.weekday) {
            return a.s.weekday - b.s.weekday;
          }
          return a.idx - b.idx;
        });
        for (let i = 0; i < indexed.length; i++) {
          const { s } = indexed[i];
          const row = slotRepo.create({
            shopId,
            weekday: s.weekday,
            startLocal: hhMmToTime(s.startLocal),
            endLocal: hhMmToTime(s.endLocal),
            sortOrder: s.sortOrder ?? i,
          });
          const saved = await slotRepo.save(row);
          deliverySlotIds.push(saved.id);
        }
      }

      const deliveryFeeRuleIds: string[] = [];
      const feeRules = [...(dto.deliveryFeeRules ?? [])].sort(
        (a, b) => a.minOrderSubtotalMinor - b.minOrderSubtotalMinor,
      );
      if (feeRules.length > 0) {
        const feeRepo = manager.getRepository(ShopDeliveryFeeRule);
        for (const r of feeRules) {
          const row = feeRepo.create({
            shopId,
            minOrderSubtotalMinor: r.minOrderSubtotalMinor,
            deliveryFeeMinor: r.deliveryFeeMinor,
          });
          const saved = await feeRepo.save(row);
          deliveryFeeRuleIds.push(saved.id);
        }
      }

      const shopContentLinkIds: string[] = [];
      const photos = dto.shopPhotos ?? [];
      if (photos.length > 0) {
        const contentRepo = manager.getRepository(Content);
        const linkRepo = manager.getRepository(ShopContentLink);
        const indexed = photos.map((p, idx) => ({ p, idx }));
        indexed.sort((a, b) => {
          const ao = a.p.sortOrder ?? a.idx;
          const bo = b.p.sortOrder ?? b.idx;
          if (ao !== bo) {
            return ao - bo;
          }
          return a.idx - b.idx;
        });
        for (let i = 0; i < indexed.length; i++) {
          const { p } = indexed[i];
          const content = await contentRepo.findOne({
            where: { id: p.contentId, isDeleted: false },
          });
          if (!content) {
            throw new NotFoundException(`Content ${p.contentId} not found`);
          }
          if (content.ownerUserId == null) {
            content.ownerUserId = userId;
            await contentRepo.save(content);
          } else if (content.ownerUserId !== userId) {
            throw new ForbiddenException(
              `Content ${p.contentId} belongs to another user`,
            );
          }
          const duplicate = await linkRepo.findOne({
            where: { shopId, contentId: p.contentId, isDeleted: false },
          });
          if (duplicate) {
            throw new ConflictException(
              `Content ${p.contentId} is already linked to this shop`,
            );
          }
          const link = linkRepo.create({
            shopId,
            contentId: p.contentId,
            sortOrder: i,
          });
          const saved = await linkRepo.save(link);
          shopContentLinkIds.push(saved.id);
        }
      }

      const spRepo = manager.getRepository(SellerProfile);
      let sellerProfile = await spRepo.findOne({
        where: { userId, isDeleted: false },
      });
      if (!sellerProfile) {
        sellerProfile = spRepo.create({
          userId,
          plan: SellerPlan.FREE,
          planStartedAt: new Date(),
          planExpiresAt: null,
          isTrialing: false,
          trialEndsAt: null,
        });
      }
      if (dto.sellerProfile) {
        const patch = dto.sellerProfile;
        if (patch.plan !== undefined) {
          sellerProfile.plan = patch.plan;
        }
        if (patch.planStartedAt !== undefined) {
          sellerProfile.planStartedAt = patch.planStartedAt;
        }
        if (patch.planExpiresAt !== undefined) {
          sellerProfile.planExpiresAt = patch.planExpiresAt;
        }
        if (patch.isTrialing !== undefined) {
          sellerProfile.isTrialing = patch.isTrialing;
        }
        if (patch.trialEndsAt !== undefined) {
          sellerProfile.trialEndsAt = patch.trialEndsAt;
        }
      }
      sellerProfile = await spRepo.save(sellerProfile);

      return {
        shopId: shop.id,
        shop,
        deliveryRadiusRuleIds,
        deliverySlotIds,
        shopContentLinkIds,
        openingHourIds,
        deliveryFeeRuleIds,
        sellerProfile,
      };
    });
  }
}
