import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ShopsModule } from '../shops/shops.module';
import { UsersModule } from '../users/users.module';
import { UserFcmToken } from './entities/user-fcm-token.entity';
import { UserNotification } from './entities/user-notification.entity';
import { ExpoPushService } from './expo-push.service';
import { FcmPushService } from './fcm-push.service';
import { NotificationsService } from './notifications.service';
import { PushDevicesController } from './push-devices.controller';
import { UserNotificationsController } from './user-notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserNotification, UserFcmToken]),
    UsersModule,
    ShopsModule,
    AuthModule,
  ],
  controllers: [UserNotificationsController, PushDevicesController],
  providers: [NotificationsService, FcmPushService, ExpoPushService],
  exports: [NotificationsService, FcmPushService, ExpoPushService],
})
export class NotificationsModule {}
