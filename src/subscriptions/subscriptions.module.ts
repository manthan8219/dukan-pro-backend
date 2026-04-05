import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ShopsModule } from '../shops/shops.module';
import { ShopSubscription } from './entities/shop-subscription.entity';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { ShopSubscriptionsController } from './shop-subscriptions.controller';
import { ShopSubscriptionsService } from './shop-subscriptions.service';
import { SubscriptionPlansService } from './subscription-plans.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SubscriptionPlan, ShopSubscription]),
    ShopsModule,
    AuthModule,
  ],
  controllers: [ShopSubscriptionsController],
  providers: [SubscriptionPlansService, ShopSubscriptionsService],
  exports: [SubscriptionPlansService, ShopSubscriptionsService],
})
export class SubscriptionsModule {}
