import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/enums/user-role.enum';
import { UsersService } from '../users/users.service';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';
import { SellerProfile } from './entities/seller-profile.entity';
import { SellerPlan } from './enums/seller-plan.enum';

@Injectable()
export class SellerProfileService {
  constructor(
    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepository: Repository<SellerProfile>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateSellerProfileDto): Promise<SellerProfile> {
    const user = await this.usersService.findOne(dto.userId);

    const existing = await this.sellerProfileRepository.findOne({
      where: { userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException(
        `Seller profile already exists for user ${dto.userId}`,
      );
    }

    // Upgrade the user's role to SELLER if not already
    if (user.role !== UserRole.SELLER) {
      await this.usersService.updateIgnoringRoleLock(dto.userId, {
        role: UserRole.SELLER,
      });
    }

    const profile = this.sellerProfileRepository.create({
      userId: dto.userId,
      plan: dto.plan ?? SellerPlan.FREE,
      planStartedAt: dto.planStartedAt ?? new Date(),
      planExpiresAt: dto.planExpiresAt ?? null,
      isTrialing: dto.isTrialing ?? false,
      trialEndsAt: dto.trialEndsAt ?? null,
    });

    return this.sellerProfileRepository.save(profile);
  }

  async findByUserId(userId: string): Promise<SellerProfile> {
    const profile = await this.sellerProfileRepository.findOne({
      where: { userId },
    });
    if (!profile) {
      throw new NotFoundException(
        `Seller profile not found for user ${userId}`,
      );
    }
    return profile;
  }

  async update(
    userId: string,
    dto: UpdateSellerProfileDto,
  ): Promise<SellerProfile> {
    const profile = await this.findByUserId(userId);
    Object.assign(profile, dto);
    return this.sellerProfileRepository.save(profile);
  }
}
