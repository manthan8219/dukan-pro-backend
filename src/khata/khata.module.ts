import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopsModule } from '../shops/shops.module';
import { UsersModule } from '../users/users.module';
import { KhataBook } from './entities/khata-book.entity';
import { KhataEntry } from './entities/khata-entry.entity';
import { ShopCustomer } from './entities/shop-customer.entity';
import { KhataService } from './khata.service';
import { ShopOwnerKhataController } from './shop-owner-khata.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopCustomer, KhataBook, KhataEntry]),
    ShopsModule,
    UsersModule,
  ],
  controllers: [ShopOwnerKhataController],
  providers: [KhataService],
  exports: [KhataService],
})
export class KhataModule {}
