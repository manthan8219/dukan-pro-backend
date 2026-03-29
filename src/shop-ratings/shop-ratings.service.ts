import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopsService } from '../shops/shops.service';
import { UsersService } from '../users/users.service';
import { Shop } from '../shops/entities/shop.entity';
import { CreateShopRatingDto } from './dto/create-shop-rating.dto';
import { ShopRating } from './entities/shop-rating.entity';

@Injectable()
export class ShopRatingsService {
  constructor(
    @InjectRepository(ShopRating)
    private readonly ratingRepository: Repository<ShopRating>,
    @InjectRepository(Shop)
    private readonly shopRepository: Repository<Shop>,
    private readonly shopsService: ShopsService,
    private readonly usersService: UsersService,
  ) {}

  async create(shopId: string, dto: CreateShopRatingDto): Promise<ShopRating> {
    await this.shopsService.findOne(shopId);
    if (dto.ratedByUserId) {
      await this.usersService.findOne(dto.ratedByUserId);
    }

    let row: ShopRating;
    if (dto.ratedByUserId) {
      const existing = await this.ratingRepository.findOne({
        where: {
          shopId,
          ratedByUserId: dto.ratedByUserId,
          isDeleted: false,
        },
      });
      if (existing) {
        existing.score = dto.score;
        existing.comment = dto.comment ?? null;
        row = await this.ratingRepository.save(existing);
      } else {
        row = await this.ratingRepository.save(
          this.ratingRepository.create({
            shopId,
            score: dto.score,
            ratedByUserId: dto.ratedByUserId,
            comment: dto.comment ?? null,
          }),
        );
      }
    } else {
      row = await this.ratingRepository.save(
        this.ratingRepository.create({
          shopId,
          score: dto.score,
          ratedByUserId: null,
          comment: dto.comment ?? null,
        }),
      );
    }

    await this.recalculateShopAggregates(shopId);
    return this.ratingRepository.findOneOrFail({ where: { id: row.id } });
  }

  async findAllByShop(shopId: string): Promise<ShopRating[]> {
    await this.shopsService.findOne(shopId);
    return this.ratingRepository.find({
      where: { shopId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async removeRating(ratingId: string): Promise<void> {
    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId, isDeleted: false },
    });
    if (!rating) {
      throw new NotFoundException(`Rating ${ratingId} not found`);
    }
    const shopId = rating.shopId;
    rating.isDeleted = true;
    await this.ratingRepository.save(rating);
    await this.recalculateShopAggregates(shopId);
  }

  private async recalculateShopAggregates(shopId: string): Promise<void> {
    const raw = await this.ratingRepository
      .createQueryBuilder('r')
      .select('AVG(r.score)', 'avg')
      .addSelect('COUNT(r.id)', 'cnt')
      .where('r.shopId = :shopId', { shopId })
      .andWhere('r.isDeleted = false')
      .getRawOne<{ avg: string | null; cnt: string }>();

    const count = Number(raw?.cnt ?? 0);
    const shop = await this.shopRepository.findOne({ where: { id: shopId } });
    if (!shop) {
      return;
    }

    if (count === 0) {
      shop.averageRating = null;
      shop.ratingCount = 0;
    } else {
      const avgNum = Number(raw?.avg ?? 0);
      shop.averageRating = avgNum.toFixed(2);
      shop.ratingCount = count;
    }
    await this.shopRepository.save(shop);
  }
}
