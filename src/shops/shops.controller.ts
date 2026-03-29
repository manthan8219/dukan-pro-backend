import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { NearbyShopsQueryDto } from './dto/nearby-shops-query.dto';
import { ShopNearbySummaryDto } from './dto/shop-nearby-summary.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { Shop } from './entities/shop.entity';
import { ShopsService } from './shops.service';

@ApiTags('shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Get('discover/nearby')
  @ApiOperation({
    summary: 'List shops that deliver to a location',
    description:
      'Pass the customer delivery coordinates. Returns active shops whose effective max service radius ' +
      '(shop default or matching delivery-radius tier for orderAmountRupees) is at least the straight-line distance to the shop pin.',
  })
  @ApiOkResponse({ type: ShopNearbySummaryDto, isArray: true })
  discoverNearby(
    @Query() query: NearbyShopsQueryDto,
  ): Promise<ShopNearbySummaryDto[]> {
    const orderAmt = query.orderAmountRupees ?? 0;
    return this.shopsService.findDeliverableNearby(
      query.latitude,
      query.longitude,
      orderAmt,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shop by id' })
  @ApiOkResponse({ type: Shop })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Shop> {
    return this.shopsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shop' })
  @ApiOkResponse({ type: Shop })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopDto,
  ): Promise<Shop> {
    return this.shopsService.update(id, dto);
  }
}
