import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrderResponseDto } from './dto/order-response.dto';
import { UpdateShopOrderStatusDto } from './dto/update-shop-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('users/:userId/shops/:shopId/orders')
export class ShopOwnerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders for a shop (owner only)' })
  @ApiOkResponse({ type: OrderResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Not the shop owner' })
  listForShop(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.listForShopOwner(ownerUserId, shopId);
  }

  @Patch(':orderId')
  @ApiOperation({ summary: 'Update fulfilment status (owner only)' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse()
  @ApiForbiddenResponse()
  updateStatus(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: UpdateShopOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateStatusForShopOwner(
      ownerUserId,
      shopId,
      orderId,
      dto.status,
    );
  }
}
