import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentModule } from '../content/content.module';
import { ProductsModule } from '../products/products.module';
import { ShopsModule } from '../shops/shops.module';
import { ShopProduct } from './entities/shop-product.entity';
import { ProductAvailabilityController } from './product-availability.controller';
import { ShopProductsController } from './shop-products.controller';
import { ShopProductsService } from './shop-products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopProduct]),
    ShopsModule,
    ProductsModule,
    ContentModule,
  ],
  controllers: [ShopProductsController, ProductAvailabilityController],
  providers: [ShopProductsService],
})
export class ShopProductsModule {}
