import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shop } from '../shops/entities/shop.entity';
import { ShopsModule } from '../shops/shops.module';
import { UsersModule } from '../users/users.module';
import { ShopRating } from './entities/shop-rating.entity';
import {
  ShopRatingByIdController,
  ShopRatingsController,
} from './shop-ratings.controller';
import { ShopRatingsService } from './shop-ratings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopRating, Shop]),
    ShopsModule,
    UsersModule,
  ],
  controllers: [ShopRatingsController, ShopRatingByIdController],
  providers: [ShopRatingsService],
  exports: [ShopRatingsService],
})
export class ShopRatingsModule {}
