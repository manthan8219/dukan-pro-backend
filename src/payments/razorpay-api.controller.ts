import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';
import { RazorpayCheckoutService } from './razorpay-checkout.service';

class RazorpayOrderResponseDto {
  id!: string;
  amount!: number;
  currency!: string;
}

class RazorpayVerifyResponseDto {
  success!: boolean;
  alreadyProcessed!: boolean;
}

/**
 * Routes under `/api/*` match the seller app `razorpayService.ts` expectations.
 * All endpoints require the same Firebase (or dev) bearer as the rest of the app.
 */
@ApiTags('payments')
@Controller('api')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class RazorpayApiController {
  constructor(private readonly checkout: RazorpayCheckoutService) {}

  @Post('create-razorpay-order')
  @ApiOperation({
    summary: 'Create a Razorpay order for SellerOS subscription (server-priced)',
  })
  @ApiCreatedResponse({ type: RazorpayOrderResponseDto })
  @ApiUnauthorizedResponse()
  createOrder(
    @CurrentUser() user: User,
    @Body() dto: CreateRazorpayOrderDto,
  ): Promise<RazorpayOrderResponseDto> {
    return this.checkout.createOrder(user.id, dto);
  }

  @Post('verify-razorpay-payment')
  @ApiOperation({
    summary:
      'Verify HMAC signature, confirm payment with Razorpay, activate subscription (idempotent)',
  })
  @ApiOkResponse({ type: RazorpayVerifyResponseDto })
  @ApiUnauthorizedResponse()
  verifyPayment(
    @CurrentUser() user: User,
    @Body() dto: VerifyRazorpayPaymentDto,
  ): Promise<RazorpayVerifyResponseDto> {
    return this.checkout.verifyPayment(user.id, dto);
  }
}
