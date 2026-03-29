import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentModule } from '../content/content.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShopsModule } from '../shops/shops.module';
import { StorageModule } from '../storage/storage.module';
import { UsersModule } from '../users/users.module';
import { CustomerDemandsLiveController } from './customer-demands-live.controller';
import { CustomerDemandsService } from './customer-demands.service';
import { DemandInvitationsService } from './demand-invitations.service';
import { ShopDemandInvitationsController } from './shop-demand-invitations.controller';
import { UserCustomerDemandsController } from './user-customer-demands.controller';
import { CustomerDemandAudit } from './entities/customer-demand-audit.entity';
import { CustomerDemand } from './entities/customer-demand.entity';
import { DemandShopInvitation } from './entities/demand-shop-invitation.entity';
import { ShopProduct } from '../shop-products/entities/shop-product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerDemand,
      CustomerDemandAudit,
      DemandShopInvitation,
      ShopProduct,
    ]),
    UsersModule,
    ContentModule,
    ShopsModule,
    NotificationsModule,
    StorageModule,
  ],
  controllers: [
    UserCustomerDemandsController,
    CustomerDemandsLiveController,
    ShopDemandInvitationsController,
  ],
  providers: [CustomerDemandsService, DemandInvitationsService],
  exports: [CustomerDemandsService, DemandInvitationsService],
})
export class CustomerDemandsModule {}
