import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { UserDeliveryAddress } from './entities/user-delivery-address.entity';
import { UserDeliveryAddressesController } from './user-delivery-addresses.controller';
import { UserDeliveryAddressesService } from './user-delivery-addresses.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDeliveryAddress]),
    UsersModule,
  ],
  controllers: [UserDeliveryAddressesController],
  providers: [UserDeliveryAddressesService],
  exports: [UserDeliveryAddressesService],
})
export class UserDeliveryAddressesModule {}
