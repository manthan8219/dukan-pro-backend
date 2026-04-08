import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { User } from '../users/entities/user.entity';
import { OrderResponseDto } from './dto/order-response.dto';
import { UpdateShopOrderStatusDto } from './dto/update-shop-order-status.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('users/:userId/shops/:shopId/orders')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse()
export class ShopOwnerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders for a shop (owner only)' })
  @ApiOkResponse({ type: OrderResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Not the shop owner' })
  listForShop(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() user: User,
  ): Promise<OrderResponseDto[]> {
    if (user.id !== ownerUserId) {
      throw new ForbiddenException();
    }
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
    @CurrentUser() user: User,
  ): Promise<OrderResponseDto> {
    if (user.id !== ownerUserId) {
      throw new ForbiddenException();
    }
    return this.ordersService.updateStatusForShopOwner(
      ownerUserId,
      shopId,
      orderId,
      dto.status,
    );
  }
}
