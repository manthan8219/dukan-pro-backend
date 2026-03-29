import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SellerDashboardResponseDto } from './dto/seller-dashboard-response.dto';
import { SellerShopDashboardService } from './seller-shop-dashboard.service';

@ApiTags('orders')
@Controller('users/:userId/shops/:shopId')
export class ShopOwnerDashboardController {
  constructor(
    private readonly sellerShopDashboardService: SellerShopDashboardService,
  ) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Seller dashboard aggregates (shop owner only)',
    description:
      'Revenue and order KPIs use non-cancelled orders bucketed by createdAt (UTC calendar month).',
  })
  @ApiOkResponse({ type: SellerDashboardResponseDto })
  @ApiNotFoundResponse({ description: 'User or shop not found' })
  @ApiForbiddenResponse({ description: 'Not the shop owner' })
  getDashboard(
    @Param('userId', ParseUUIDPipe) ownerUserId: string,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ): Promise<SellerDashboardResponseDto> {
    return this.sellerShopDashboardService.getForShopOwner(ownerUserId, shopId);
  }
}
