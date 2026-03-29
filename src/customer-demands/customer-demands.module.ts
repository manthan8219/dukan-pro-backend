import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentModule } from '../content/content.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShopsModule } from '../shops/shops.module';
import { UsersModule } from '../users/users.module';
import { CustomerDemandsLiveController } from './customer-demands-live.controller';
import { CustomerDemandsService } from './customer-demands.service';
import { DemandInvitationsService } from './demand-invitations.service';
import { ShopDemandInvitationsController } from './shop-demand-invitations.controller';
import { UserCustomerDemandsController } from './user-customer-demands.controller';
import { CustomerDemandAudit } from './entities/customer-demand-audit.entity';
import { CustomerDemand } from './entities/customer-demand.entity';
import { DemandShopInvitation } from './entities/demand-shop-invitation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerDemand,
      CustomerDemandAudit,
      DemandShopInvitation,
    ]),
    UsersModule,
    ContentModule,
    ShopsModule,
    NotificationsModule,
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
