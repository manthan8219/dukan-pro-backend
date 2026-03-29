import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContentModule } from './content/content.module';
import { SellerProfileModule } from './seller-profile/seller-profile.module';
import { ShopContentModule } from './shop-content/shop-content.module';
import { ShopDeliveryRadiusRulesModule } from './shop-delivery-radius-rules/shop-delivery-radius-rules.module';
import { ShopRatingsModule } from './shop-ratings/shop-ratings.module';
import { ShopProductsModule } from './shop-products/shop-products.module';
import { ShopsModule } from './shops/shops.module';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { CustomerDemandsModule } from './customer-demands/customer-demands.module';
import { UsersModule } from './users/users.module';

const skipDb = process.env.SKIP_DB === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ...(skipDb
      ? []
      : [
          TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
              const databaseUrl = config.get<string>('DATABASE_URL');
              const nodeEnv = config.get<string>('NODE_ENV', 'development');
              const isProd = nodeEnv === 'production';
              const syncFlag = config.get<string>('TYPEORM_SYNC');
              /** Auto-create/alter tables from entities. Off in production; in dev on unless TYPEORM_SYNC=false */
              const synchronize =
                !isProd &&
                syncFlag !== 'false' &&
                (syncFlag === 'true' || syncFlag === undefined);
              const base = {
                type: 'postgres' as const,
                autoLoadEntities: true,
                synchronize,
                retryAttempts: 10,
                retryDelay: 3000,
              };
              if (databaseUrl) {
                return { ...base, url: databaseUrl };
              }
              return {
                ...base,
                host: config.get<string>('POSTGRES_HOST', 'localhost'),
                port: config.get<number>('POSTGRES_PORT', 5432),
                username: config.get<string>('POSTGRES_USER', 'postgres'),
                password: config.get<string>('POSTGRES_PASSWORD', 'postgres'),
                database: config.get<string>('POSTGRES_DB', 'dukaan'),
              };
            },
          }),
          MongooseModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              uri: config.get<string>(
                'MONGODB_URI',
                'mongodb://127.0.0.1:27017/dukaan',
              ),
              serverSelectionTimeoutMS: 5000,
            }),
          }),
          UsersModule,
          AuthModule,
          ShopsModule,
          SellerProfileModule,
          ShopDeliveryRadiusRulesModule,
          ShopRatingsModule,
          ContentModule,
          ShopContentModule,
          ProductsModule,
          ShopProductsModule,
          CustomerDemandsModule,
        ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
