import { Module } from '@nestjs/common';
import { ShopsModule } from '../shops/shops.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersModule } from '../users/users.module';
import { ShopOnboardingController } from './shop-onboarding.controller';
import { ShopOnboardingService } from './shop-onboarding.service';

@Module({
  imports: [ShopsModule, SubscriptionsModule, UsersModule],
  controllers: [ShopOnboardingController],
  providers: [ShopOnboardingService],
})
export class ShopOnboardingModule {}
