import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OnboardShopDto } from './dto/onboard-shop.dto';
import { ShopOnboardingResponseDto } from './dto/shop-onboarding-response.dto';
import { ShopOnboardingService } from './shop-onboarding.service';

@ApiTags('shops')
@Controller('users/:userId/shops')
export class ShopOnboardingController {
  constructor(private readonly shopOnboardingService: ShopOnboardingService) {}

  @Post('onboard')
  @ApiOperation({
    summary: 'One-shot shop onboarding',
    description:
      'Creates the shop, optional ordering limits & free-delivery policy (orderingDelivery on the shop row), opening hours, ' +
      'delivery fee tiers, delivery-radius tiers, delivery slot rows, gallery links, and ensures seller_profiles exists. ' +
      'Upload images via storage presign + POST /contents first, then pass content ids in shopPhotos.',
  })
  @ApiCreatedResponse({ type: ShopOnboardingResponseDto })
  @ApiNotFoundResponse({ description: 'User or content not found' })
  onboard(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: OnboardShopDto,
  ): Promise<ShopOnboardingResponseDto> {
    return this.shopOnboardingService.onboard(userId, dto);
  }
}
