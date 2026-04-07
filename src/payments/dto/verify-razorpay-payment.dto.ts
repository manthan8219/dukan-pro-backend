import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class VerifyRazorpayPaymentDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(64)
  razorpay_payment_id: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(64)
  razorpay_order_id: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(256)
  razorpay_signature: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  shopId: string;
}
