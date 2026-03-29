import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { CreateShopRatingDto } from './dto/create-shop-rating.dto';
import { ShopRating } from './entities/shop-rating.entity';
import { ShopRatingsService } from './shop-ratings.service';

@ApiTags('shop-ratings')
@Controller('shops/:shopId/ratings')
export class ShopRatingsController {
  constructor(private readonly shopRatingsService: ShopRatingsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Add a rating (recalculates shop averageRating & ratingCount). Same ratedByUserId replaces prior row.',
  })
  @ApiCreatedResponse({ type: ShopRating })
  @ApiNotFoundResponse({ description: 'Shop or user not found' })
  create(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: CreateShopRatingDto,
  ): Promise<ShopRating> {
    return this.shopRatingsService.create(shopId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List active ratings for a shop' })
  @ApiOkResponse({ type: ShopRating, isArray: true })
  @ApiNotFoundResponse({ description: 'Shop not found' })
  list(@Param('shopId', ParseUUIDPipe) shopId: string): Promise<ShopRating[]> {
    return this.shopRatingsService.findAllByShop(shopId);
  }
}

@ApiTags('shop-ratings')
@Controller('shop-ratings')
export class ShopRatingByIdController {
  constructor(private readonly shopRatingsService: ShopRatingsService) {}

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft-delete a rating row and recalculate shop aggregates',
  })
  @ApiNotFoundResponse()
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.shopRatingsService.removeRating(id);
  }
}
