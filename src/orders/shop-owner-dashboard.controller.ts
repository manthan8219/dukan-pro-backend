import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
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
import { SellerDashboardResponseDto } from './dto/seller-dashboard-response.dto';
import { SellerShopDashboardService } from './seller-shop-dashboard.service';

@ApiTags('orders')
@Controller('users/:userId/shops/:shopId')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse()
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
    @CurrentUser() user: User,
  ): Promise<SellerDashboardResponseDto> {
    if (user.id !== ownerUserId) {
      throw new ForbiddenException();
    }
    return this.sellerShopDashboardService.getForShopOwner(ownerUserId, shopId);
  }
}
