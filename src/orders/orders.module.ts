import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { CustomerDemandsModule } from '../customer-demands/customer-demands.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShopOrdersModule } from '../shop-orders/shop-orders.module';
import { ShopProduct } from '../shop-products/entities/shop-product.entity';
import { ShopsModule } from '../shops/shops.module';
import { UserDeliveryAddress } from '../user-delivery-addresses/entities/user-delivery-address.entity';
import { UsersModule } from '../users/users.module';
import { CustomerOrdersController } from './customer-orders.controller';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrdersService } from './orders.service';
import { SellerShopDashboardService } from './seller-shop-dashboard.service';
import { ShopOwnerDashboardController } from './shop-owner-dashboard.controller';
import { ShopOwnerOrdersController } from './shop-owner-orders.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      ShopProduct,
      UserDeliveryAddress,
    ]),
    UsersModule,
    ShopsModule,
    NotificationsModule,
    CustomerDemandsModule,
    ShopOrdersModule,
    AuthModule,
  ],
  controllers: [
    CustomerOrdersController,
    ShopOwnerOrdersController,
    ShopOwnerDashboardController,
  ],
  providers: [OrdersService, SellerShopDashboardService],
  exports: [OrdersService],
})
export class OrdersModule {}
