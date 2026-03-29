import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Contact } from '../commons/types/contact.types';
import type { Gst } from '../commons/types/gst.types';
import type { Location } from '../commons/types/location.types';
import { effectiveMaxServiceRadiusKmForOrder } from '../shop-delivery-radius-rules/effective-radius.util';
import { ShopDeliveryRadiusRule } from '../shop-delivery-radius-rules/entities/shop-delivery-radius-rule.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { ShopNearbySummaryDto } from './dto/shop-nearby-summary.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { Shop } from './entities/shop.entity';
import { haversineDistanceKm } from './geo.util';
import type { ShopOffering } from './types/shop-offering.types';

@Injectable()
export class ShopsService {
  constructor(
    @InjectRepository(Shop)
    private readonly shopsRepository: Repository<Shop>,
    @InjectRepository(ShopDeliveryRadiusRule)
    private readonly deliveryRulesRepository: Repository<ShopDeliveryRadiusRule>,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateShopDto): Promise<Shop> {
    await this.usersService.findOne(userId);
    const shop = this.shopsRepository.create({
      userId,
      name: dto.name,
      displayName: dto.displayName,
      billingName: dto.billingName,
      location: this.buildLocation(dto.location),
      offering: this.buildOffering(dto.offering),
      contact: this.buildContact(dto.contact),
      gst: this.buildGst(dto.gst),
      notes: dto.notes ?? null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.shopsRepository.save(shop);
    await this.usersService.update(userId, {
      role: UserRole.SELLER,
      sellerOnboardingComplete: true,
    });
    return saved;
  }

  async findByUserId(userId: string): Promise<Shop[]> {
    await this.usersService.findOne(userId);
    return this.shopsRepository.find({
      where: { userId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Shop> {
    const shop = await this.shopsRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!shop) {
      throw new NotFoundException(`Shop ${id} not found`);
    }
    return shop;
  }

  /**
   * Shops that can deliver to (latitude, longitude) at the given order value,
   * using the same tier logic as GET /shops/:shopId/delivery-radius-rules/effective.
   */
  async findDeliverableNearby(
    latitude: number,
    longitude: number,
    orderAmountRupees = 0,
  ): Promise<ShopNearbySummaryDto[]> {
    const [shops, rules] = await Promise.all([
      this.shopsRepository.find({
        where: { isDeleted: false, isActive: true },
      }),
      this.deliveryRulesRepository.find({ where: { isDeleted: false } }),
    ]);

    const rulesByShop = new Map<string, ShopDeliveryRadiusRule[]>();
    for (const r of rules) {
      const list = rulesByShop.get(r.shopId) ?? [];
      list.push(r);
      rulesByShop.set(r.shopId, list);
    }

    const out: ShopNearbySummaryDto[] = [];
    for (const shop of shops) {
      const slat = shop.location.coordinates.latitude;
      const slng = shop.location.coordinates.longitude;
      if (
        slat == null ||
        slng == null ||
        !Number.isFinite(slat) ||
        !Number.isFinite(slng)
      ) {
        continue;
      }

      const distanceKm = haversineDistanceKm(latitude, longitude, slat, slng);
      const shopRules = rulesByShop.get(shop.id) ?? [];
      const ruleInputs = shopRules.map((r) => ({
        minOrderAmount: Number(r.minOrderAmount),
        maxServiceRadiusKm: r.maxServiceRadiusKm,
      }));
      const effectiveMaxServiceRadiusKm = effectiveMaxServiceRadiusKmForOrder({
        shopDefaultRadiusKm: shop.offering.serviceRadiusKm,
        rules: ruleInputs,
        orderAmountRupees,
      });

      if (distanceKm > effectiveMaxServiceRadiusKm + 1e-6) {
        continue;
      }

      const avg =
        shop.averageRating != null && shop.averageRating !== ''
          ? Number(shop.averageRating)
          : null;

      out.push({
        id: shop.id,
        displayName: shop.displayName,
        name: shop.name,
        distanceKm: Math.round(distanceKm * 1000) / 1000,
        effectiveMaxServiceRadiusKm,
        addressText: shop.location.addressText,
        city: shop.location.structured?.city ?? null,
        shopType: shop.offering.shopType,
        dealIn: shop.offering.dealIn,
        averageRating:
          avg != null && Number.isFinite(avg)
            ? Math.round(avg * 100) / 100
            : null,
        ratingCount: shop.ratingCount,
      });
    }

    out.sort((a, b) => a.distanceKm - b.distanceKm);
    return out;
  }

  async update(id: string, dto: UpdateShopDto): Promise<Shop> {
    const shop = await this.findOne(id);
    if (dto.name !== undefined) shop.name = dto.name;
    if (dto.displayName !== undefined) shop.displayName = dto.displayName;
    if (dto.billingName !== undefined) shop.billingName = dto.billingName;
    if (dto.notes !== undefined) shop.notes = dto.notes;
    if (dto.isActive !== undefined) shop.isActive = dto.isActive;
    if (dto.location !== undefined) {
      shop.location = this.mergeLocation(shop.location, dto.location);
    }
    if (dto.offering !== undefined) {
      shop.offering = this.mergeOffering(shop.offering, dto.offering);
    }
    if (dto.contact !== undefined) {
      shop.contact = this.mergeContact(shop.contact, dto.contact);
    }
    if (dto.gst !== undefined) {
      shop.gst = this.mergeGst(shop.gst, dto.gst);
    }
    return this.shopsRepository.save(shop);
  }

  private buildLocation(input: CreateShopDto['location']): Location {
    const c = input.coordinates;
    return {
      coordinates: {
        latitude: c?.latitude ?? null,
        longitude: c?.longitude ?? null,
      },
      addressText: input.addressText ?? null,
      structured: {
        line1: input.structured?.line1 ?? null,
        line2: input.structured?.line2 ?? null,
        city: input.structured?.city ?? null,
        stateRegion: input.structured?.stateRegion ?? null,
        postalCode: input.structured?.postalCode ?? null,
        country: input.structured?.country ?? null,
      },
    };
  }

  private buildOffering(input: CreateShopDto['offering']): ShopOffering {
    return {
      shopType: input.shopType,
      dealIn: input.dealIn,
      serviceRadiusKm: input.serviceRadiusKm,
    };
  }

  private buildContact(input: CreateShopDto['contact']): Contact {
    return {
      phone: input?.phone ?? null,
      email: input?.email ?? null,
      website: input?.website ?? null,
    };
  }

  private buildGst(input: CreateShopDto['gst']): Gst {
    return {
      isGstApplicable: input.isGstApplicable,
      gstNo: input.isGstApplicable ? (input.gstNo ?? null) : null,
    };
  }

  private mergeLocation(
    current: Location,
    patch: NonNullable<UpdateShopDto['location']>,
  ): Location {
    const next: Location = {
      ...current,
      coordinates: { ...current.coordinates },
      structured: { ...current.structured },
    };
    if (patch.coordinates !== undefined) {
      next.coordinates = { ...next.coordinates, ...patch.coordinates };
    }
    if (patch.addressText !== undefined) next.addressText = patch.addressText;
    if (patch.structured !== undefined) {
      next.structured = { ...next.structured, ...patch.structured };
    }
    return next;
  }

  private mergeOffering(
    current: ShopOffering,
    patch: NonNullable<UpdateShopDto['offering']>,
  ): ShopOffering {
    return {
      shopType: patch.shopType ?? current.shopType,
      dealIn: patch.dealIn ?? current.dealIn,
      serviceRadiusKm: patch.serviceRadiusKm ?? current.serviceRadiusKm,
    };
  }

  private mergeContact(
    current: Contact,
    patch: NonNullable<UpdateShopDto['contact']>,
  ): Contact {
    return {
      phone: patch.phone !== undefined ? patch.phone : current.phone,
      email: patch.email !== undefined ? patch.email : current.email,
      website: patch.website !== undefined ? patch.website : current.website,
    };
  }

  private mergeGst(
    current: Gst,
    patch: NonNullable<UpdateShopDto['gst']>,
  ): Gst {
    const isGstApplicable = patch.isGstApplicable ?? current.isGstApplicable;
    const gstNo = patch.gstNo !== undefined ? patch.gstNo : current.gstNo;
    return {
      isGstApplicable,
      gstNo: isGstApplicable ? gstNo : null,
    };
  }
}
