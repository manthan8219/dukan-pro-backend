import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { OrderPaymentMethod } from '../enums/order-payment-method.enum';
import { CheckoutOrderLineDto } from './checkout-order-line.dto';

export class PlaceOrdersCheckoutDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Saved user delivery address for this shipment.',
  })
  @IsUUID()
  deliveryAddressId: string;

  @ApiPropertyOptional({ enum: OrderPaymentMethod })
  @IsOptional()
  @IsEnum(OrderPaymentMethod)
  paymentMethod?: OrderPaymentMethod;

  @ApiProperty({ type: [CheckoutOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutOrderLineDto)
  items: CheckoutOrderLineDto[];
}
