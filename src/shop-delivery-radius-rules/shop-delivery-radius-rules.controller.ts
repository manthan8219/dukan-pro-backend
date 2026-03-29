import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateShopDeliveryRadiusRuleDto } from './dto/create-shop-delivery-radius-rule.dto';
import { EffectiveDeliveryRadiusQueryDto } from './dto/effective-delivery-radius-query.dto';
import { EffectiveDeliveryRadiusResponseDto } from './dto/effective-delivery-radius-response.dto';
import { ShopDeliveryRadiusRule } from './entities/shop-delivery-radius-rule.entity';
import { ShopDeliveryRadiusRulesService } from './shop-delivery-radius-rules.service';

@ApiTags('shop-delivery-radius-rules')
@Controller('shops/:shopId/delivery-radius-rules')
export class ShopDeliveryRadiusRulesController {
  constructor(
    private readonly shopDeliveryRadiusRulesService: ShopDeliveryRadiusRulesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Add an order-amount tier for service radius' })
  @ApiCreatedResponse({ type: ShopDeliveryRadiusRule })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  create(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: CreateShopDeliveryRadiusRuleDto,
  ): Promise<ShopDeliveryRadiusRule> {
    return this.shopDeliveryRadiusRulesService.create(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List radius tiers for a shop' })
  @ApiOkResponse({ type: ShopDeliveryRadiusRule, isArray: true })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  findAllByShop(
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ): Promise<ShopDeliveryRadiusRule[]> {
    return this.shopDeliveryRadiusRulesService.findAllByShop(shopId);
  }

  @Get('effective')
  @ApiOperation({
    summary:
      'Resolve effective max radius for an order amount (best matching tier, else shop default)',
  })
  @ApiOkResponse({ type: EffectiveDeliveryRadiusResponseDto })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  effective(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query() query: EffectiveDeliveryRadiusQueryDto,
  ): Promise<EffectiveDeliveryRadiusResponseDto> {
    return this.shopDeliveryRadiusRulesService.resolveEffectiveRadius(
      shopId,
      query.orderAmount,
    );
  }
}
