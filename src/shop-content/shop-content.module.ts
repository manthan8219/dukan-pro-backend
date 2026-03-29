import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentModule } from '../content/content.module';
import { ShopsModule } from '../shops/shops.module';
import { ShopContentLink } from './entities/shop-content-link.entity';
import { ShopContentController } from './shop-content.controller';
import { ShopContentService } from './shop-content.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopContentLink]),
    forwardRef(() => ContentModule),
    ShopsModule,
  ],
  controllers: [ShopContentController],
  providers: [ShopContentService],
  exports: [ShopContentService],
})
export class ShopContentModule {}
