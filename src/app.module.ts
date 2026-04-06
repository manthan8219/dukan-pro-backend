import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ContentModule } from './content/content.module';
import { SellerProfileModule } from './seller-profile/seller-profile.module';
import { ShopContentModule } from './shop-content/shop-content.module';
import { ShopDeliveryRadiusRulesModule } from './shop-delivery-radius-rules/shop-delivery-radius-rules.module';
import { ShopRatingsModule } from './shop-ratings/shop-ratings.module';
import { ShopProductsModule } from './shop-products/shop-products.module';
import { ShopOnboardingModule } from './shop-onboarding/shop-onboarding.module';
import { ShopsModule } from './shops/shops.module';
import { ProductsModule } from './products/products.module';
import { AuthModule } from './auth/auth.module';
import { CustomerDemandsModule } from './customer-demands/customer-demands.module';
import { UserRolesModule } from './user-roles/user-roles.module';
import { UsersModule } from './users/users.module';
import { UserDeliveryAddressesModule } from './user-delivery-addresses/user-delivery-addresses.module';
import { StorageModule } from './storage/storage.module';
import { OrdersModule } from './orders/orders.module';
import { ScannerSessionModule } from './scanner-session/scanner-session.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { KhataModule } from './khata/khata.module';
import { typeOrmEntities } from './database/typeorm-entities';

const skipDb = process.env.SKIP_DB === 'true';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScannerSessionModule,
    ...(skipDb
      ? []
      : [
          TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
              const databaseUrl = config.get<string>('DATABASE_URL');
              const runMigrations =
                config.get<string>('TYPEORM_MIGRATIONS_RUN', 'true') !==
                'false';
              const base = {
                type: 'postgres' as const,
                entities: typeOrmEntities,
                migrations: [join(__dirname, 'database', 'migrations', '*.js')],
                migrationsRun: runMigrations,
                /** One transaction per migration so ADD ENUM VALUE can commit before the next migration uses it. */
                migrationsTransactionMode: 'each' as const,
                synchronize: false,
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
          UserRolesModule,
          UserDeliveryAddressesModule,
          AuthModule,
          ShopsModule,
          ShopOnboardingModule,
          SellerProfileModule,
          ShopDeliveryRadiusRulesModule,
          ShopRatingsModule,
          ContentModule,
          ShopContentModule,
          ProductsModule,
          ShopProductsModule,
          CustomerDemandsModule,
          StorageModule,
          OrdersModule,
          SubscriptionsModule,
          KhataModule,
        ]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
