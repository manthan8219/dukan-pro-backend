import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrderResponseDto } from './dto/order-response.dto';
import { PlaceOrdersCheckoutDto } from './dto/place-orders-checkout.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('users/:userId/orders')
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @ApiOperation({
    summary:
      'Place orders from cart (one row per shop; delivery fee split across shops)',
  })
  @ApiCreatedResponse({ type: OrderResponseDto, isArray: true })
  @ApiNotFoundResponse({ description: 'User or delivery address not found' })
  checkout(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: PlaceOrdersCheckoutDto,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.checkout(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List orders placed by the customer' })
  @ApiOkResponse({ type: OrderResponseDto, isArray: true })
  list(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.listForUser(userId);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Order detail with line items' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse()
  findOne(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.findOneForUser(userId, orderId);
  }
}
