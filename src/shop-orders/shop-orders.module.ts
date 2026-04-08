import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ShopsModule } from '../shops/shops.module';
import { ShopOrdersGateway } from './shop-orders.gateway';

@Module({
  imports: [AuthModule, ShopsModule],
  providers: [ShopOrdersGateway],
  exports: [ShopOrdersGateway],
})
export class ShopOrdersModule {}
