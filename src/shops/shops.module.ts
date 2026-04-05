import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ShopDeliveryRadiusRule } from '../shop-delivery-radius-rules/entities/shop-delivery-radius-rule.entity';
import { UsersModule } from '../users/users.module';
import { Shop } from './entities/shop.entity';
import { ShopsController } from './shops.controller';
import { ShopsService } from './shops.service';
import { UserShopsController } from './user-shops.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shop, ShopDeliveryRadiusRule]),
    UsersModule,
    AuthModule,
  ],
  controllers: [UserShopsController, ShopsController],
  providers: [ShopsService],
  exports: [ShopsService],
})
export class ShopsModule {}
