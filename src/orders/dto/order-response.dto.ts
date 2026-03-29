import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderPaymentMethod } from '../enums/order-payment-method.enum';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ format: 'uuid' })
  shopId: string;

  @ApiPropertyOptional({
    description: 'Shop display name when joined for lists.',
  })
  shopDisplayName?: string;

  @ApiProperty({ format: 'uuid' })
  deliveryAddressId: string;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  itemsSubtotalMinor: number;

  @ApiProperty()
  deliveryFeeMinor: number;

  @ApiProperty()
  totalMinor: number;

  @ApiPropertyOptional({ enum: OrderPaymentMethod, nullable: true })
  paymentMethod: OrderPaymentMethod | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  deliveredAt: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];
}
