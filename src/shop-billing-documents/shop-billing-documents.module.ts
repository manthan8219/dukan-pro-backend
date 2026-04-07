import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ContentModule } from '../content/content.module';
import { ShopsModule } from '../shops/shops.module';
import { ShopBillingDocument } from './entities/shop-billing-document.entity';
import { ShopBillingDocumentsController } from './shop-billing-documents.controller';
import { ShopBillingDocumentsService } from './shop-billing-documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopBillingDocument]),
    ShopsModule,
    ContentModule,
    AuthModule,
  ],
  controllers: [ShopBillingDocumentsController],
  providers: [ShopBillingDocumentsService],
  exports: [ShopBillingDocumentsService],
})
export class ShopBillingDocumentsModule {}
