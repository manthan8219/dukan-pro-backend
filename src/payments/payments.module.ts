import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ShopsModule } from '../shops/shops.module';
import { RazorpayCheckoutOrder } from './entities/razorpay-checkout-order.entity';
import { RazorpayApiController } from './razorpay-api.controller';
import { RazorpayBrowserCallbackController } from './razorpay-browser-callback.controller';
import { RazorpayCheckoutService } from './razorpay-checkout.service';
import { RazorpayClientService } from './razorpay-client.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RazorpayCheckoutOrder]),
    ShopsModule,
    AuthModule,
  ],
  controllers: [RazorpayApiController, RazorpayBrowserCallbackController],
  providers: [RazorpayClientService, RazorpayCheckoutService],
})
export class PaymentsModule {}
