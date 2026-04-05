import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscriptionPlan } from './entities/subscription-plan.entity';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly plansRepository: Repository<SubscriptionPlan>,
  ) {}

  async create(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const row = this.plansRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      trialDays: dto.trialDays ?? 0,
      billingPeriod: dto.billingPeriod,
      priceAmountMinor: dto.priceAmountMinor ?? null,
      currency: dto.currency ?? 'INR',
      features: dto.features ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.plansRepository.save(row);
  }

  async findAll(includeInactive = false): Promise<SubscriptionPlan[]> {
    const where = includeInactive
      ? { isDeleted: false }
      : { isDeleted: false, isActive: true };
    return this.plansRepository.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<SubscriptionPlan> {
    const plan = await this.plansRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!plan) {
      throw new NotFoundException(`Subscription plan ${id} not found`);
    }
    return plan;
  }

  async findByCode(code: string): Promise<SubscriptionPlan> {
    const plan = await this.plansRepository.findOne({
      where: { code, isDeleted: false },
    });
    if (!plan) {
      throw new NotFoundException(`Subscription plan code ${code} not found`);
    }
    return plan;
  }

  async assertActivePlan(id: string): Promise<SubscriptionPlan> {
    const plan = await this.findOne(id);
    if (!plan.isActive) {
      throw new NotFoundException(`Subscription plan ${id} is not active`);
    }
    return plan;
  }

  async update(
    id: string,
    dto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlan> {
    const plan = await this.findOne(id);
    if (dto.code !== undefined) plan.code = dto.code;
    if (dto.name !== undefined) plan.name = dto.name;
    if (dto.description !== undefined) plan.description = dto.description;
    if (dto.trialDays !== undefined) plan.trialDays = dto.trialDays;
    if (dto.billingPeriod !== undefined) plan.billingPeriod = dto.billingPeriod;
    if (dto.priceAmountMinor !== undefined) {
      plan.priceAmountMinor = dto.priceAmountMinor;
    }
    if (dto.currency !== undefined) plan.currency = dto.currency;
    if (dto.features !== undefined) plan.features = dto.features;
    if (dto.isActive !== undefined) plan.isActive = dto.isActive;
    if (dto.sortOrder !== undefined) plan.sortOrder = dto.sortOrder;
    return this.plansRepository.save(plan);
  }

  async softDelete(id: string): Promise<void> {
    const plan = await this.findOne(id);
    plan.isDeleted = true;
    await this.plansRepository.save(plan);
  }
}
