import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ShopsModule } from '../shops/shops.module';
import { ShopSupplier } from './entities/shop-supplier.entity';
import { ShopSuppliersController } from './shop-suppliers.controller';
import { ShopSuppliersService } from './shop-suppliers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopSupplier]),
    ShopsModule,
    AuthModule,
  ],
  controllers: [ShopSuppliersController],
  providers: [ShopSuppliersService],
  exports: [ShopSuppliersService],
})
export class ShopSuppliersModule {}
