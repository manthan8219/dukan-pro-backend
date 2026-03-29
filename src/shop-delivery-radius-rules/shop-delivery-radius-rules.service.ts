import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopsService } from '../shops/shops.service';
import { CreateShopDeliveryRadiusRuleDto } from './dto/create-shop-delivery-radius-rule.dto';
import { EffectiveDeliveryRadiusResponseDto } from './dto/effective-delivery-radius-response.dto';
import { UpdateShopDeliveryRadiusRuleDto } from './dto/update-shop-delivery-radius-rule.dto';
import { ShopDeliveryRadiusRule } from './entities/shop-delivery-radius-rule.entity';
import { effectiveMaxServiceRadiusKmForOrder } from './effective-radius.util';

@Injectable()
export class ShopDeliveryRadiusRulesService {
  constructor(
    @InjectRepository(ShopDeliveryRadiusRule)
    private readonly rulesRepository: Repository<ShopDeliveryRadiusRule>,
    private readonly shopsService: ShopsService,
  ) {}

  async create(
    shopId: string,
    dto: CreateShopDeliveryRadiusRuleDto,
  ): Promise<ShopDeliveryRadiusRule> {
    await this.shopsService.findOne(shopId);
    const minOrderAmount = this.toMoneyString(dto.minOrderAmount);
    await this.assertNoDuplicateMinAmount(shopId, minOrderAmount);
    const rule = this.rulesRepository.create({
      shopId,
      minOrderAmount,
      maxServiceRadiusKm: dto.maxServiceRadiusKm,
    });
    return this.rulesRepository.save(rule);
  }

  async findAllByShop(shopId: string): Promise<ShopDeliveryRadiusRule[]> {
    await this.shopsService.findOne(shopId);
    return this.rulesRepository.find({
      where: { shopId, isDeleted: false },
      order: { minOrderAmount: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ShopDeliveryRadiusRule> {
    const rule = await this.rulesRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!rule) {
      throw new NotFoundException(`Delivery radius rule ${id} not found`);
    }
    return rule;
  }

  async update(
    id: string,
    dto: UpdateShopDeliveryRadiusRuleDto,
  ): Promise<ShopDeliveryRadiusRule> {
    const rule = await this.findOne(id);
    if (dto.minOrderAmount !== undefined) {
      const nextMin = this.toMoneyString(dto.minOrderAmount);
      await this.assertNoDuplicateMinAmount(rule.shopId, nextMin, rule.id);
      rule.minOrderAmount = nextMin;
    }
    if (dto.maxServiceRadiusKm !== undefined) {
      rule.maxServiceRadiusKm = dto.maxServiceRadiusKm;
    }
    return this.rulesRepository.save(rule);
  }

  async remove(id: string): Promise<void> {
    const rule = await this.findOne(id);
    rule.isDeleted = true;
    await this.rulesRepository.save(rule);
  }

  async resolveEffectiveRadius(
    shopId: string,
    orderAmount: number,
  ): Promise<EffectiveDeliveryRadiusResponseDto> {
    const shop = await this.shopsService.findOne(shopId);
    const shopDefault = shop.offering.serviceRadiusKm;

    const rules = await this.rulesRepository.find({
      where: { shopId, isDeleted: false },
    });

    const ruleInputs = rules.map((r) => ({
      minOrderAmount: Number(r.minOrderAmount),
      maxServiceRadiusKm: r.maxServiceRadiusKm,
    }));
    const sorted = [...rules].sort(
      (a, b) => Number(b.minOrderAmount) - Number(a.minOrderAmount),
    );
    const match = sorted.find((r) => orderAmount >= Number(r.minOrderAmount));

    const maxFromRule = match ? match.maxServiceRadiusKm : null;
    const effective = effectiveMaxServiceRadiusKmForOrder({
      shopDefaultRadiusKm: shopDefault,
      rules: ruleInputs,
      orderAmountRupees: orderAmount,
    });

    return {
      orderAmount,
      matchedRuleId: match?.id ?? null,
      maxServiceRadiusKmFromRule: maxFromRule,
      shopDefaultServiceRadiusKm: shopDefault,
      effectiveMaxServiceRadiusKm: effective,
    };
  }

  private toMoneyString(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
  }

  private async assertNoDuplicateMinAmount(
    shopId: string,
    minOrderAmount: string,
    excludeRuleId?: string,
  ): Promise<void> {
    const qb = this.rulesRepository
      .createQueryBuilder('r')
      .where('r.shopId = :shopId', { shopId })
      .andWhere('r.isDeleted = false')
      .andWhere('r.minOrderAmount = :minOrderAmount', { minOrderAmount });
    if (excludeRuleId) {
      qb.andWhere('r.id != :excludeRuleId', { excludeRuleId });
    }
    const count = await qb.getCount();
    if (count > 0) {
      throw new ConflictException(
        'A rule with this minimum order amount already exists for this shop',
      );
    }
  }
}
