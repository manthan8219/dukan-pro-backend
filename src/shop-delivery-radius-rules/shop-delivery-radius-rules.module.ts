import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopsModule } from '../shops/shops.module';
import { DeliveryRadiusRuleController } from './delivery-radius-rule.controller';
import { ShopDeliveryRadiusRule } from './entities/shop-delivery-radius-rule.entity';
import { ShopDeliveryRadiusRulesController } from './shop-delivery-radius-rules.controller';
import { ShopDeliveryRadiusRulesService } from './shop-delivery-radius-rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([ShopDeliveryRadiusRule]), ShopsModule],
  controllers: [
    ShopDeliveryRadiusRulesController,
    DeliveryRadiusRuleController,
  ],
  providers: [ShopDeliveryRadiusRulesService],
  exports: [ShopDeliveryRadiusRulesService],
})
export class ShopDeliveryRadiusRulesModule {}
