import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopsModule } from '../shops/shops.module';
import { UsersModule } from '../users/users.module';
import { UserNotification } from './entities/user-notification.entity';
import { NotificationsService } from './notifications.service';
import { UserNotificationsController } from './user-notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserNotification]),
    UsersModule,
    ShopsModule,
  ],
  controllers: [UserNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
