import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateShopDeliveryRadiusRuleDto } from './dto/update-shop-delivery-radius-rule.dto';
import { ShopDeliveryRadiusRule } from './entities/shop-delivery-radius-rule.entity';
import { ShopDeliveryRadiusRulesService } from './shop-delivery-radius-rules.service';

@ApiTags('shop-delivery-radius-rules')
@Controller('delivery-radius-rules')
export class DeliveryRadiusRuleController {
  constructor(
    private readonly shopDeliveryRadiusRulesService: ShopDeliveryRadiusRulesService,
  ) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Update a delivery radius tier' })
  @ApiOkResponse({ type: ShopDeliveryRadiusRule })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopDeliveryRadiusRuleDto,
  ): Promise<ShopDeliveryRadiusRule> {
    return this.shopDeliveryRadiusRulesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Soft-delete a delivery radius tier' })
  @ApiNotFoundResponse({ description: 'Rule not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.shopDeliveryRadiusRulesService.remove(id);
  }
}
