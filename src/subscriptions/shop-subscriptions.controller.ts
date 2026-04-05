import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
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
import { ShopsService } from '../shops/shops.service';
import { ShopSubscriptionAccessDto } from './dto/shop-subscription-access.dto';
import { ShopSubscription } from './entities/shop-subscription.entity';
import { ShopSubscriptionsService } from './shop-subscriptions.service';

@ApiTags('shops')
@Controller('shops')
@UseGuards(FirebaseAuthGuard)
@ApiBearerAuth()
export class ShopSubscriptionsController {
  constructor(
    private readonly shopSubscriptionsService: ShopSubscriptionsService,
    private readonly shopsService: ShopsService,
  ) {}

  @Get(':shopId/subscription/access')
  @ApiOperation({
    summary: 'Seller subscription / trial access for a shop',
    description:
      'Returns whether app features should be enabled, trial dates, and phase. ' +
      'Call after the seller picks a shop (same bearer as `/shops/me`).',
  })
  @ApiOkResponse({ type: ShopSubscriptionAccessDto })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse({
    description: 'Shop is not owned by the signed-in user',
  })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  async getAccess(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() user: User,
  ): Promise<ShopSubscriptionAccessDto> {
    await this.shopsService.findOneOwnedByUser(shopId, user.id);
    return this.shopSubscriptionsService.getAccessSummary(shopId);
  }

  @Post(':shopId/subscription/start-free-trial')
  @ApiOperation({
    summary: 'Start the 31-day seller app free trial',
    description:
      'Idempotent while the trial is still active. Fails if the trial already ended (seller must subscribe).',
  })
  @ApiCreatedResponse({ type: ShopSubscription })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  startFreeTrial(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() user: User,
  ): Promise<ShopSubscription> {
    return this.shopSubscriptionsService.startSellerAppFreeTrial(
      shopId,
      user.id,
    );
  }
}
